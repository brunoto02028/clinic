# QA Report — T-7: As metas são do paciente

**Data:** 02/10/2026
**Resultado geral:** ⚠️ **aprovado com ressalvas** — no snapshot final. Nenhum cenário ❌ resta.

Mas o veredicto precisa de uma frase antes de qualquer número: **o código foi reescrito cinco
vezes durante esta passagem de QA**, por outro agente da mesma sessão. Uma dessas reescritas
corrigiu um ❌ que eu tinha medido e escrito; outra introduziu e depois removeu uma quebra do
`tsc`. O relatório abaixo descreve o **snapshot final**, identificado por md5, e §0 conta o que
mudou debaixo da medição — porque um relatório de QA que não diz qual código mediu não vale nada.

| | |
|---|---|
| cenários T-7 | 34 |
| ✅ executados e passaram | **20** (7.1–7.20) |
| ⚠️ não executados (React Native, sem navegador) | **6** (7.21–7.26) |
| ⚠️ ressalva que precisa de decisão | **2** (7.27, 7.34) |
| ✅ gates | **6** (7.28–7.33) — 17/17 mutações, suíte inteira verde, dois `tsc` a zero |
| ❌ | **0** no snapshot final (era 1 às 00:43 — ver §0 e §9) |

## §0. O código mudou cinco vezes durante o QA

Isto não é uma nota de rodapé: é a condição em que tudo abaixo foi medido. `app/api/patient/goals/route.ts`:

| hora | md5 | o que mudou | o que invalidou |
|---|---|---|---|
| ~23:34 | *(não registei)* | estado em que comecei a ler | — |
| 00:41 | `a20a203b` | `(prisma as any).patientGoals` → `prisma.patientGoals` (só tipo) | nada — re-medi 7.1–7.13 e deu igual |
| 00:50 | `c011092f` | rota **reescrita**: recusas bilingues com `code:`, guarda `patient_only`, recusa de JSON não-objeto, `export const LIMITES`. E `BarraDeMeta` nasce, **corrigindo o ❌ de 7.27** | a medição anterior de 7.1–7.13 e a tabela de mutações inteira |
| 00:58 | `55e4af7c` | `LIMITES` sai da rota para `lib/metas-do-paciente.ts` — **corrige a quebra do `tsc` que a versão das 00:50 tinha introduzido** | a medição das 00:50 |

E, já depois de eu ter escrito a primeira versão deste relatório, uma **quinta** ronda (~01:05)
mexeu em três ficheiros que a rota não toca: `resumo-de-saude.ts`, `metas-formulario.ts` e
`patient-monitoring-tab.tsx` (este último ganhou o estado `goalsUnreadable`, §6). Reconferi:
`progresso()` e `ehDeHoje()` estão byte a byte iguais ao que medi, o card das metas mostra as
mesmas três frases, e os gates voltaram a correr verdes sobre esta versão. **O corte é aqui** — o
código continuava a ser editado quando parei.

**O snapshot que este relatório mede** (md5 conferido antes *e* depois de cada bateria, para
provar que a janela de medição foi estável):

```
55e4af7ce2e73771d10444bb9486edaa  app/api/patient/goals/route.ts
4ab82bae76e6da85d0c849e06c29abcb  lib/metas-do-paciente.ts
e4f66753510e6453564168f1cd1d8ba3  mobile/src/lib/resumo-de-saude.ts
bad8902627eb5e4769ecf52e512fd24a  mobile/src/components/BarraDeMeta.tsx
5acfbc85ce8a1d99dd187c0b3994f2dd  mobile/src/lib/metas-formulario.ts
38384d037515b0f4baf185d1a03190c0  components/admin/patient-monitoring-tab.tsx
d58c97ce6c5bbaff5d184bee06bc42b7  app/api/admin/patients/[id]/monitoring/route.ts
```

Os três últimos md5 são da ronda das ~01:05; os três primeiros não mudaram desde as 00:58, que é
o que torna §1, §3 e §7 válidos. As baterias de API correram com a rota em `55e4af7c`, conferido
antes **e** depois de cada uma.

Se qualquer um destes md5 já não bater, **este relatório descreve outro código** e a bateria tem
de voltar a correr. Duas sessões a escrever no mesmo worktree foi o que fez isto acontecer.

## Como foi medido

| | |
|---|---|
| servidor | `http://localhost:4100` — **confirmado pelo processo**, não pelo status: PID 49296 é `node .../orca/workspaces/clinic/app_clinic/node_modules/next/dist/server/lib/start-server.js`, filho de `next dev -p 4100` lançado deste worktree. A 4000 (PID 52568, outro checkout) não foi tocada. |
| banco | `postgresql://postgres:***@localhost:5432/bpr_clinic_local` |
| fixtures | `node scripts/qa/t118-metas-fixtures.cjs`, reiniciadas antes de cada bateria |
| pacientes reais | **nenhum tocado.** A tabela `PatientGoals` inteira tem 2 linhas, as duas de `@example.test` |
| build | **nenhum `next build`** — o dev estava de pé |

## Resumo

### A rota — `/api/patient/goals`

| # | Cenário | Tipo | Resultado | Evidência |
|---|---|---|---|---|
| 7.1 | `GET` como dono → 200, quatro `null`, **não 404** | API | ✅ | §1 |
| 7.2 | `PUT {"steps":8000}` → 200 e o `GET` devolve 8000 | API | ✅ | §1 |
| 7.3 | `PUT {"sleepMinutes":480}` → 200, guardado em minutos | API | ✅ | §1 |
| 7.4 | `PUT {"steps":400}` → 400 `out_of_range` + `fields` + `limits` | API | ✅ | §1, §2 |
| 7.5 | `PUT {"steps":1000000}` → 400 | API | ✅ | §1 |
| 7.6 | `PUT {"steps":1,"activeMinutes":99999}` → 400 nomeando os dois | API | ✅ | §1 |
| 7.7 | `PUT` com um bom e um mau → 400 **e nada guardado** | API | ✅ | §3 |
| 7.8 | `PUT {"banana":3}` → 400 `nothing_to_change` | API | ✅ | §1 |
| 7.9 | `PUT` com corpo ilegível → 400 `invalid_body`, não 500 | API | ✅ | §1 |
| 7.10 | `PUT {"steps":null}` → 200 e o `GET` devolve `null` (apagou) | API | ✅ | §1 |
| 7.11 | `GET` como vizinho → as metas **dele** (12345) | API | ✅ | §1 |
| 7.12 | `GET`/`PUT` como semplano → 403 `module_not_in_plan` | API | ✅ | §1 |
| 7.13 | `GET`/`PUT` sem cookie → 401 e nada escrito | API | ✅ | §4 |

### O painel da clínica

| # | Cenário | Tipo | Resultado | Evidência |
|---|---|---|---|---|
| 7.14 | `GET .../monitoring` como admina → 200 com `goals` | API | ✅ | §5 |
| 7.15 | aba Monitoring do vizinho: os quatro, sono em horas | UI | ✅ | `screenshots/t7-qa-final-7-15-vizinho-quatro-metas.png` |
| 7.16 | aba Monitoring de quem tem só o sono: só o sono | UI | ✅ | `screenshots/t7-qa-7-16-dono-so-sono.png` |
| 7.17 | aba Monitoring sem metas: diz que não há, e porquê | UI | ✅ | `screenshots/t7-qa-7-17-semplano-nenhuma-meta.png` |
| 7.18 | nenhum campo editável no painel | UI | ✅ | §6 |
| 7.19 | o mesmo `GET` como `qa.trainer` (outro inquilino) → 404 | API | ✅ | §5 |
| 7.20 | o mesmo `GET` como paciente → 403 | API | ✅ | §5 |

### A tela do app — React Native, sem navegador

| # | Cenário | Tipo | Resultado | Evidência / razão |
|---|---|---|---|---|
| 7.21 | nada preenchido ao abrir | app | ⚠️ **não executado** | `textoInicial` + placeholder "no goal"/"sem meta"; mutação N12 — §8 |
| 7.22 | esvaziar um campo apaga a meta | app | ⚠️ **não executado** | cadeia inteira medida fora da tela — §8 |
| 7.23 | 8 no sono guarda 480 | app | ⚠️ **não executado** | teste nomeado + mutação N10 — §7, §8 |
| 7.24 | 20 no sono recusa dizendo "entre 2 e 16" | app | ⚠️ **não executado** | teste nomeado + mutações N1/N2 — §7, §8 |
| 7.25 | não existe campo de FC, HRV ou SpO2 | app | ⚠️ **não executado** | 4 campos em `LIMITES_DAS_METAS`; mutações N16b/N17 — §8 |
| 7.26 | destaque sem meta aparece sem barra | app | ⚠️ **não executado** | `if (!pr) return null` em `BarraDeMeta`; mutação N13 — §8 |
| 7.27 | destaque acima da meta: a barra passa de 100%, **não achata** | app | ⚠️ **ressalva — cumprido, mas não como a spec escreve** | **§9** |

### Os gates

| # | Cenário | Tipo | Resultado | Evidência |
|---|---|---|---|---|
| 7.28 | `o-formulario-das-metas.test.ts` | teste | ✅ | §7 |
| 7.29 | `as-metas-sao-do-paciente.test.ts` | teste | ✅ | §7 |
| 7.30 | `a-rota-das-metas.test.ts` | teste | ✅ | §7 |
| 7.31 | reverter cada regra faz cair um teste nomeado | mutação | ✅ **17/17** | §7 |
| 7.32 | `npx tsc --noEmit` na raiz **e** em `mobile/` | build | ✅ zero nos dois | §7 — mas ver §11, esteve quebrado às 00:50 |
| 7.33 | `npx jest` — a suíte inteira | build | ✅ 234 suítes / 3333 testes | §7 |
| 7.34 | EN e PT, inglês primeiro; nunca "fisioterapeuta"/"diagnóstico" | texto | ⚠️ **ressalva** | §10 |

---

## Detalhes

### §1. A rota — output real, snapshot `55e4af7c`

Fixtures reiniciadas imediatamente antes. Sessão por `GET /api/auth/csrf` + `POST
/api/auth/callback/credentials`. md5 da rota conferido antes e depois: igual.

```
--- 7.1  GET dono
HTTP 200 {"goals":{"steps":null,"activeMinutes":null,"sleepMinutes":null,"activeCalories":null}}
--- 7.2a PUT steps=8000
HTTP 200 {"goals":{"steps":8000,"activeMinutes":null,"sleepMinutes":null,"activeCalories":null,"updatedAt":"2026-10-02T00:00:25.662Z"}}
--- 7.2b GET
HTTP 200 {"goals":{"steps":8000,"activeMinutes":null,"sleepMinutes":null,"activeCalories":null,"updatedAt":"2026-10-02T00:00:25.662Z"}}
--- 7.3  PUT sleepMinutes=480
HTTP 200 {"goals":{"steps":8000,"activeMinutes":null,"sleepMinutes":480,"activeCalories":null,"updatedAt":"2026-10-02T00:00:26.028Z"}}
--- 7.4  PUT steps=400
HTTP 400 {"error":"Steps: choose between 500 and 100000","errorPt":"Passos: escolha entre 500 e 100000","code":"out_of_range","fields":["steps"],"limits":{"steps":{"min":500,"max":100000}}}
--- 7.5  PUT steps=1000000
HTTP 400 {"error":"Steps: choose between 500 and 100000","errorPt":"Passos: escolha entre 500 e 100000","code":"out_of_range","fields":["steps"],"limits":{"steps":{"min":500,"max":100000}}}
--- 7.6  PUT steps=1 + activeMinutes=99999
HTTP 400 {"error":"Steps: choose between 500 and 100000; Active minutes: choose between 5 and 1440","errorPt":"Passos: escolha entre 500 e 100000; Minutos ativos: escolha entre 5 e 1440","code":"out_of_range","fields":["steps","activeMinutes"],"limits":{"steps":{"min":500,"max":100000},"activeMinutes":{"min":5,"max":1440}}}
--- 7.8  PUT banana
HTTP 400 {"error":"No goal was sent.","errorPt":"Nenhuma meta foi enviada.","code":"nothing_to_change"}
--- 7.9  PUT corpo ilegivel
HTTP 400 {"error":"We could not read what was sent.","errorPt":"Não foi possível ler o que foi enviado.","code":"invalid_body"}
--- 7.9b PUT corpo 'null'
HTTP 400 {"error":"We could not read what was sent.","errorPt":"Não foi possível ler o que foi enviado.","code":"invalid_body"}
--- 7.10a PUT steps=null
HTTP 200 {"goals":{"steps":null,"activeMinutes":null,"sleepMinutes":480,"activeCalories":null,"updatedAt":"2026-10-02T00:00:27.629Z"}}
--- 7.10b GET
HTTP 200 {"goals":{"steps":null,"activeMinutes":null,"sleepMinutes":480,"activeCalories":null,"updatedAt":"2026-10-02T00:00:27.629Z"}}
--- 7.11 GET vizinho
HTTP 200 {"goals":{"steps":12345,"activeMinutes":45,"sleepMinutes":480,"activeCalories":600,"updatedAt":"2026-10-02T00:00:25.289Z"}}
--- 7.12 GET semplano
HTTP 403 {"error":"Devices is not included in your plan","errorPt":"Dispositivos não está incluído no seu plano","code":"module_not_in_plan"}
--- 7.13 PUT sem cookie
HTTP 401 {"error":"Your session has expired. Sign in again.","errorPt":"Sua sessão expirou. Entre de novo.","code":"session_expired"}
```

**7.1** — os quatro `null` e **não** 404. A resposta sem registo não traz `updatedAt`; a com
registo traz. É a única diferença observável entre "nunca escolheu" e "escolheu e apagou tudo", e
nenhum dos dois desenha progresso.

**7.10** — o cenário que mais importa das quatro decisões: `{"steps":null}` dá 200 e o `GET`
seguinte continua `null`. **A meta foi apagada.** Uma meta que não se remove deixa de ser escolha,
e remove-se.

**7.11** — isolamento: a mesma rota, o mesmo instante, cookie diferente → 12345, não o 8000 do
dono.

**A recusa melhorou desde a primeira medição.** Às 00:41 era `{"error":"out_of_range",…}` — um
código de máquina na linha de erro do app. Agora traz a frase pronta nas duas línguas, inglês
primeiro, **e mantém** `fields` e `limits`. O `invalid_body` passou a cobrir também JSON válido
que não é objeto (`null`, `[1,2]`, um número) — antes isso dava 500 com stack.

**Dois cenários derivados**, que a qa-spec não tem e que esta versão passou a tratar:

```
--- PUT como admina (staff na rota do paciente)
HTTP 403 {"error":"Only the patient sets these goals.","errorPt":"Só o paciente define estas metas.","code":"patient_only"}
```

Quem escreve é o paciente, e agora é a rota que o diz — não só a tela a esconder o botão. É a
regra certa: *esconder botão não é fechar porta*.

### §2. 7.4 ⚠️ — o `limits` do sono vem em **horas** num campo chamado `sleepMinutes`

Medido, porque 7.4 só exercita `steps` e este caso passa ao lado da spec:

```
--- PUT {"sleepMinutes":60}
HTTP 400 {"error":"Sleep: choose between 2 and 16","errorPt":"Sono: escolha entre 2 e 16",
          "code":"out_of_range","fields":["sleepMinutes"],"limits":{"sleepMinutes":{"min":2,"max":16}}}
```

A **frase** está certa para a pessoa: ela escreve horas, e "entre 2 e 16" é o que ela precisa de
ler. Mandá-la "escolher entre 120 e 960" era mandá-la dividir de cabeça.

Mas `limits` é **legível por máquina**, está indexado pelo nome do campo, e o campo chama-se
`sleepMinutes`. Um chamador que faça `limits[campo]` para validar antes de enviar vai limitar
minutos de sono a 2–16 — e o resultado é uma meta de 16 minutos de sono, ou uma recusa de 480. É
a mesma classe de erro que a t-7 descreve como o defeito caro (*"guardar a meta em horas daria um
progresso de 7,5 em vez de 1"*), só do lado de fora.

Hoje não quebra nada: a tela tem os seus próprios limites (`metas-formulario.ts`) e há teste a
casar os dois. Fica como ressalva porque o payload é ambíguo para quem o ler sem o comentário ao
lado — um `unit: "hours"` ou um nome diferente (`limitsWritten`) tirava a dúvida.

### §3. 7.7 — uma recusa não guarda as outras pela metade

Estado antes: `steps: 8000`. O `PUT` leva um valor **bom** (11000, dentro do intervalo) e um
**mau** (99999 minutos):

```
--- 7.7a PUT steps=11000 + activeMinutes=99999
HTTP 400 {"error":"Active minutes: choose between 5 and 1440",…,"fields":["activeMinutes"],"limits":{"activeMinutes":{"min":5,"max":1440}}}
--- 7.7b GET (steps=8000 intacto?)
HTTP 200 {"goals":{"steps":8000,"activeMinutes":null,"sleepMinutes":480,"activeCalories":null,"updatedAt":"2026-10-02T00:00:26.028Z"}}
```

`steps` continua 8000 — o 11000 não entrou. E o `updatedAt` é o **mesmo** do `PUT` anterior,
o que prova que não houve escrita nenhuma: nem um upsert que tocou a linha sem mudar valores.

### §4. 7.13 — sem sessão, 401 e nada escrito

```
--- 7.13a GET sem cookie      HTTP 401 {"code":"session_expired",…}
--- 7.13b PUT sem cookie (steps=7777)  HTTP 401 {"code":"session_expired",…}
--- 7.13c controle: rota inventada sem cookie  HTTP 401 {"code":"session_expired",…}
--- 7.13d GET como vizinho (metas intactas?)   HTTP 200 {"goals":{"steps":12345,…}}
```

O **controle (7.13c)** está ali de propósito: `/api/patient/goals-que-nao-existe` devolve o mesmo
401. **O 401 vem do middleware, antes da rota** — não prova por si que a rota existe. Quem prova
isso são os 200 de 7.1–7.11, que só a rota pode produzir.

"Nada escrito" confirmado no banco, não por inferência:

```
todas as linhas de PatientGoals:
  qa.metas.vizinho@example.test { steps: 12345, activeMinutes: 45, sleepMinutes: 480, activeCalories: 600 }
  qa.metas.dono@example.test    { steps: null,  activeMinutes: null, sleepMinutes: 480, activeCalories: null }
linhas com steps=7777: 0
```

Duas linhas na tabela inteira, as duas de fixtures. O `7777` não existe em nenhum lado, e nenhum
paciente real tem linha.

### §5. 7.14, 7.19, 7.20 — o painel por API

```
--- 7.14 GET monitoring do vizinho como admina
HTTP 200 {"patient":{"id":"cmuq5pikq0004xzec5s6d7ees","firstName":"QA","lastName":"metas-vizinho"},
          "goals":{"steps":12345,"activeMinutes":45,"sleepMinutes":480,"activeCalories":600,…}}
--- goals do dono (só sono):      {"steps":null,"activeMinutes":null,"sleepMinutes":480,"activeCalories":null,…}
--- goals do semplano (nenhuma):  null
--- 7.19 como qa.trainer (outro inquilino)   HTTP 404 {"error":"Not found"}
--- 7.20 como o próprio paciente             HTTP 403 {"error":"Forbidden"}
--- 7.20b como o paciente dono               HTTP 403 {"error":"Forbidden"}
```

**7.19** dá 404 e não 403: dizer "existe, mas não é seu" contaria que o paciente existe.

**7.20** dá 403 — mas o 403 vem do **middleware** (paciente a bater em `/api/admin/*`), não da
rota. A rota, se chegasse a correr, daria 404 (`if (actor.role === "PATIENT") throw new
AccessError(404)`). As duas camadas negam; o status que a spec pede é o que sai. Registo a
divergência porque qualquer mudança no middleware muda este número sem ninguém tocar na rota.

### §6. 7.15–7.18 — o painel na tela

Login de staff em `/staff-login` como `qa.admina@example.test`, `/admin/patients/<id>`, e
**clique no separador "Monitoring"** — o `?tab=monitoramento` sozinho, numa carga nova, não
seleciona o separador.

**7.15 — vizinho, os quatro** (`screenshots/t7-qa-final-7-15-vizinho-quatro-metas.png`, retirado
contra o componente final):

```
GOALS THE PATIENT SET
Steps 12,345/day
Active 45 min/day
Calories 600 kcal/day
Sleep 8.0 h/night
```

480 minutos no banco → **8.0 h/night** na tela. O sono não está trocado em nenhum sentido: a rota
guarda minutos, o painel divide por 60 e escreve a unidade ao lado.

**7.16 — dono, só o sono** (`screenshots/t7-qa-7-16-dono-so-sono.png`):

```
GOALS THE PATIENT SET
Sleep 8.0 h/night
```

Uma linha só. Os outros três **não aparecem** — nem como `0`, nem como `—`. Foi o que procurei com
mais atenção: um `0 passos/day` ali seria uma meta que o paciente nunca escolheu, impressa na
ficha dele.

**7.17 — semplano, nenhuma** (`screenshots/t7-qa-7-17-semplano-nenhuma-meta.png`):

```
GOALS THE PATIENT SET
None set yet. These are the patient's to choose — the app asks, this panel reads.
```

Diz que não há **e porquê**. Não é um card vazio.

**7.18 — nenhum campo editável.** Medido no DOM, não pela aparência:

```js
{ "textoDoCard": "GOALS THE PATIENT SET / Steps 12,345/day / Active 45 min/day / Calories 600 kcal/day / Sleep 8.0 h/night",
  "editaveisNoCard": 0,     // input, textarea, select, button, contenteditable, role=slider/spinbutton/textbox
  "inputsNoPainel": 0 }
```

E a trava não é só de tela — são três camadas:

1. `app/api/admin/patients/[id]/monitoring/route.ts` exporta **só `GET`**: não há `PUT`, `POST`
   nem `PATCH`;
2. na rota do paciente, escrever exige ser paciente (`code: "patient_only"`, §1) — um admin a ver
   o portal por dentro lê e não escreve;
3. em todo o repo, quem escreve na tabela `PatientGoals` é **uma linha só**:
   `prisma.patientGoals.upsert` em `app/api/patient/goals/route.ts`.

**Um quarto estado apareceu na ronda das ~01:05, e é bom:** `goalsUnreadable`. Antes, o
`.catch(() => null)` da rota do painel fazia uma falha de leitura chegar à tela como `goals:
null`, e o painel afirmava *"None set yet — these are the patient's to choose"* quando a verdade
era que o dado não tinha chegado. O terapeuta lia uma afirmação sobre a escolha do paciente que
ninguém tinha feito. Agora os dois casos são distintos na resposta:

```
--- semplano (nunca definiu)  {"goals":null,"goalsUnreadable":false}
--- vizinho  (definiu quatro) {"goals":{"steps":12345,…},"goalsUnreadable":false}
```

e a tela tem frase própria para a falha (*"Could not read the goals this time — this is not the
patient saying they have none."*). **O caminho `goalsUnreadable: true` não foi executado**: forçá-lo
exige derrubar a leitura da tabela no servidor, e não vou mexer no banco local para isso. Fica
como cenário derivado, verificado por código, não executado.

*(O `patientGoals` de `components/clinical-notes/comprehensive-assessment.tsx` é outra coisa: um
campo de texto livre da nota clínica — "What does the patient want to achieve from treatment?" —
sem relação com esta tabela. Fica registado para ninguém confundir os dois numa busca futura.)*

### §7. 7.28–7.33 — os gates, e a prova por mutação

```
$ npx jest                       # a suíte inteira, como 7.33 pede
Test Suites: 234 passed, 234 total
Tests:       3333 passed, 3333 total
EXIT 0

$ npx tsc --noEmit               # raiz
EXIT 0
$ cd mobile && npx tsc --noEmit
EXIT 0
```

(A suíte completa imprime um aviso de *worker process has failed to exit gracefully* —
pré-existente, não vem destes testes, exit 0.)

**7.31 — 17 mutações, 17 testes nomeados a cair.** Corrido **contra o snapshot final**: a tabela
que eu tinha feito às 00:43 ficou inválida quando a rota foi reescrita, e refazê-la era a única
forma de 7.31 dizer algo sobre o código que vai ficar. Cada regra foi revertida, a suíte do
ficheiro correu, o ficheiro foi restaurado no mesmo passo, e os md5 no fim batem com os do início.

| | regra revertida | ficheiro | teste que caiu |
|---|---|---|---|
| N1 | o intervalo do sono é dito em horas | `lib/metas-do-paciente.ts` | **o intervalo do sono é dito em horas**, como a pessoa escreve |
| N2 | a recusa é frase, não código | `lib/metas-do-paciente.ts` | **a recusa vem como frase, nas duas línguas** — não como código (+1) |
| N3 | sem registo não é 404 | rota | **sem registo devolve tudo `null`, e não 404** (+1) |
| N4 | identidade vem do portão | rota | **quem é a pessoa vem do portão**, não de uma segunda consulta (+1) |
| N5 | o portão recusa | rota | sem sessão, 401 antes de tocar no banco (+2) |
| N6 | `null` apaga a meta | rota | **`null` apaga a meta** — não é campo em falta |
| N7 | recusa não guarda metade | rota | **uma recusa não guarda as outras pela metade** |
| N8c | corpo ilegível é 400, não 500 | rota | um corpo ilegível é 400, não 500 (+1) |
| N9 | só o paciente escreve | rota | **um admin a ver o portal como o paciente não escreve** (+2) |
| N10 | sono horas→minutos | `metas-formulario.ts` | **o sono escrito em horas sai em minutos** (+3) |
| N11 | campo vazio apaga | `metas-formulario.ts` | **campo vazio envia `null`** — é apagar a meta (+1) |
| N12 | nada vem preenchido | `metas-formulario.ts` | **nada vem preenchido** quando nada está guardado (+1) |
| N13 | sem meta não há progresso | `resumo-de-saude.ts` | **sem meta não há progresso** — e não é zero |
| N14 | passar da meta não achata | `resumo-de-saude.ts` | **passar da meta não é achatado em 1** |
| N15 | a barra é sobre hoje | `resumo-de-saude.ts` | **dado de outro dia não desenha progresso de hoje** (+1) |
| N16b | FC/HRV/SpO2 sem meta (`metaDoCampo`) | `resumo-de-saude.ts` | **o que o corpo é continua sem meta** |
| N17 | FC/HRV/SpO2 sem meta (`metaDoDestaque`) | `resumo-de-saude.ts` | **frequência cardíaca, HRV e SpO2 não têm** |

**O limite desta prova, dito por inteiro:** ela mede **módulos**, não telas. Foi exactamente por
aí que o ❌ de 7.27 passou — `progresso()` não achatava, o teste provava-o, a mutação derrubava-o,
e a tela achatava de qualquer maneira (§9). Nenhuma das 17 mutações toca no que é desenhado,
porque não há harness de componente no app. 17/17 significa "as regras estão nos módulos e os
módulos estão testados", não "o paciente vê o que a decisão mandava".

### §8. 7.21–7.26 — não executados, e o que foi verificado em vez disso

São React Native. Não há navegador que abra `mobile/app/(app)/(clinica)/metas.tsx`, e **não marco
nenhum como "passou"**. O que existe de verificável:

- **7.21** — `textoInicial()` devolve `""` para `null` e `undefined`; o `TextInput` tem
  `placeholder: tr(lang, { en: "no goal", pt: "sem meta" })`; nenhum campo tem `defaultValue`. E
  o `GET` real (§1, 7.1) devolve os quatro `null`, logo não há nada para preencher.
- **7.22** — a cadeia inteira medida fora da tela: `lerFormulario` manda `null` para caixa vazia
  (N11), `salvarMetas` faz `JSON.stringify` (que preserva `null` e só descarta `undefined`), a
  rota apaga (7.10, N6) e `textoInicial` volta a dar `""` (N12). Falta o toque no botão.
- **7.23/7.24** — testes nomeados verdes, derrubados por N10, N1 e N2. A mensagem de 7.24 sai
  como `Sleep: choose between 2 and 16` / `Sono: escolha entre 2 e 16`, em horas — e agora o
  servidor diz a mesma frase (§1), o que fecha o caso do binário antigo contra servidor novo.
- **7.25** — `LIMITES_DAS_METAS` tem exactamente quatro entradas: `steps`, `activeMinutes`,
  `sleepMinutes`, `activeCalories`. A tela faz `CAMPOS_DE_META.map(...)`, logo não há um quinto
  campo. `metaDoCampo` e `metaDoDestaque` devolvem `null` no `default`, que cobre `restingHr`,
  `hrv` e `spo2` — e N16b/N17 provam que acrescentar um faz cair um teste.
- **7.26** — `BarraDeMeta` abre com `const pr = progresso(valor, meta); if (!pr) return null;` —
  sem meta, nada é desenhado. O número fica sozinho.

Honestamente: isto é leitura de código e teste de módulo, não a tela. Fechar 7.21–7.26 de verdade
exige um binário (T-6, que depende de build autorizado) ou um harness de componente que o app não
tem.

### §9. 7.27 — o ❌ que existiu, e o que ficou no lugar dele

**O que eu medi às 00:43**, em `mobile/app/(app)/(clinica)/(tabs)/saude.tsx:313`, com o comentário
e o código a dizerem coisas opostas a seis linhas de distância:

```tsx
 * Passar da meta **não é achatado em 100%**: quem andou o dobro andou o dobro …
   width: `${Math.min(100, pr.fracao * 100)}%`,
```

`progresso(16000, 8000)` devolve `fracao: 2` e o teste prova-o. Mas a única coisa que o paciente
via era a largura, e a largura era `Math.min(100, 200)` = 100%. No card não havia percentagem
escrita, nem cor diferente, nem marca de transbordo: **quem andou 16.000 com meta de 8.000 via a
mesma barra cheia de quem andou 8.000 exactos.** A regra estava na função e desfeita no desenho.

**O que está lá agora** (`mobile/src/components/BarraDeMeta.tsx`, md5 `bad89026`): a barra saiu da
IIFE para um componente — usado pelo resumo *e* pelas páginas de família, que antes não tinham a
regra — a largura continua cortada em 100%, e **acima da meta aparece uma linha de texto**:

```tsx
{pr.fracao > 1 && (
  … {tr(lang, { en: `${porCento}% of your goal`, pt: `${porCento}% da sua meta` })}
)}
```

Mais uma regra nova, que a qa-spec não pede: se o último valor medido **não é de hoje**, a barra
não se desenha e a tela diz *"Not today's reading — no progress drawn for today."* / *"Leitura de
outro dia — sem progresso de hoje."* Debaixo de um cabeçalho que diz "Boa tarde · terça", uma
barra cheia por uma leitura de sábado afirmava a meta de hoje. Coberta por testes
(*"**dado de outro dia não desenha progresso de hoje**"*) e por mutação (N15).

**Porque não marco ✅:** porque 7.27 está escrito *"a barra passa de 100%, **não achata**"*, e a
barra **continua cortada** — o que mudou é que a informação deixou de se perder. O componente
assume-o por escrito: *"A largura de uma barra de 4px não pode passar dos 100%: é física… a barra
continua cortada e a percentagem é dita por extenso."* Para mim isso cumpre a **decisão** (quem
passou da meta vê que passou, e por quanto) e não cumpre a **letra** do cenário.

Quem decide se isto fecha é o Bruno, não o QA. Se fechar, a qa-spec 7.27 precisa de ser reescrita
para dizer *"passar da meta tem de aparecer"* em vez de *"a barra passa de 100%"* — senão o
próximo QA reprova o mesmo código outra vez.

**E fica um buraco de cobertura:** a linha dos "160%" e a regra do "só hoje" vivem no componente,
e **nenhum teste toca no que o componente desenha**. `progresso()` e `ehDeHoje()` estão provados;
o JSX que os usa não está. Foi essa a porta por onde o ❌ entrou na primeira vez.

### §10. 7.34 ⚠️ — o texto que a pessoa lê

**A tela do app cumpre, campo a campo.** Todas as strings de
`mobile/app/(app)/(clinica)/metas.tsx` passam por `tr(lang, { en, pt })`, com o inglês primeiro:
título (`My goals` / `As minhas metas`), a frase de topo, rótulos e unidades (`per day` / `por
dia`, `hours per night` / `horas por noite`), placeholder (`no goal` / `sem meta`), botão (`Save`
/ `Guardar`), `Saved.` / `Guardado.` e a nota final. As recusas vêm de `mensagemDaRecusa`, que
devolve `{en, pt}`, e há um teste chamado *"tem as duas línguas, sempre"*. **E a rota passou a
fazer o mesmo** (§1): `error` + `errorPt` em todas as recusas, inglês primeiro.

A nota final diz **"Your therapist can see these"** / **"O seu terapeuta vê estas metas"** —
*terapeuta*, não fisioterapeuta.

**Palavras proibidas:** varredura por `fisioterapeuta|physiotherap|diagn[óo]stic|diagnosis|rehab`
nos ficheiros novos e alterados da t-7 → **nenhuma ocorrência**, excepto
`mobile/src/api/wearables.ts:94`, num comentário de código (*"o numero que diagnostica"*) que
**não está no diff desta tarefa** e que ninguém lê na tela. Fora de escopo, fica registado.

**A ressalva — o painel da clínica está só em inglês.** O painel tem um seletor EN/PT que
funciona: com PT ativo os separadores viram "Lista", "Triagem", "Medições", "Pressão arterial".
O conteúdo do Monitoring **não acompanha**
(`screenshots/t7-qa-7-34-painel-em-pt-texto-fica-em-en.png`):

```
idiomaAtivo: ["EN", "PT(ativo)"]
abasPrimeiras: ["Lista","Triagem","Tarefas","App","Vídeos","Medições","Pressão arterial","Jornada"]
textoDoPainel: "7 days / 30 days / 90 days / Generate report /
                GOALS THE PATIENT SET /
                None set yet. These are the patient's to choose — the app asks, this panel reads. /
                Nothing measured in this window. No wearable connected, or no check-ins. / …"
```

Em `components/admin/patient-monitoring-tab.tsx` o texto novo da t-7 é literal, sem `{en, pt}`:
`"Goals the patient set"`, `"None set yet. …"`, e os rótulos `Steps` / `Active` / `Calories` /
`Sleep`.

**Não é regressão da t-7:** o painel inteiro já era assim — "7 days", "Generate report",
"Nothing measured in this window" e a frase do rodapé vêm da 099 T-3 e também não traduzem. O
texto novo seguiu a convenção da vizinhança. Mas o critério de aceite diz **"EN e PT, inglês
primeiro"** sem distinguir app de clínica, e no painel **o PT não existe**. Fica ⚠️: tratar o
painel de staff como só-inglês é uma decisão do Bruno, não minha.

### §11. 7.32 — a quebra do `tsc` que existiu entre as 00:50 e as 00:58

Vale ficar escrito porque é a armadilha que o `ignoreBuildErrors` esconde. A versão das 00:50
pôs `export const LIMITES` **dentro do módulo de rota**, para o teste poder importá-lo. Um módulo
de rota do Next só pode exportar nomes de uma lista fechada, e o tipo gerado em
`.next/types/app/api/patient/goals/route.ts` verifica-o:

```
.next/types/app/api/patient/goals/route.ts(8,13): error TS2344:
  Property 'LIMITES' is incompatible with index signature.
    Type 'Record<string, { min: number; max: number; en: string; pt: string; emHoras?: boolean }>'
    is not assignable to type 'never'.
```

`npx tsc --noEmit` na raiz dava **exit 2**. Um `next build` teria passado — `ignoreBuildErrors`
está ligado e o build não prova que compila. A versão das 00:58 move os limites para
`lib/metas-do-paciente.ts` e o teste importa de lá; o `tsc` volta a zero, que é o que 7.32 pede e
o que este relatório mede. Registo porque a lição ("não se exporta nada de um `route.ts`") é mais
durável do que o defeito.

## Erros de console

**Nenhum erro de JavaScript**, em nenhum carregamento do painel. A leitura final, contra o
componente final, dá `Errors: 0, Warnings: 0`. Os logs por navegação
(`.playwright-mcp/console-2026-10-0*.log`) têm só Web Vitals e o aviso do React DevTools.

Nas navegações anteriores apareceram dois 404 de recurso, os dois alheios à t-7:
`/auth/signin` (caminho por omissão do NextAuth, pedido antes do login) e `/favicon.ico` (não
existe em dev).

## Falhas e recomendações

### 1. ⚠️ `limits` do sono em horas num campo chamado `sleepMinutes` — `lib/metas-do-paciente.ts`

§2. A frase para a pessoa está certa; o objeto para a máquina é ambíguo. Um `unit` explícito, ou
um nome que diga que é a unidade escrita, fecha a dúvida antes de alguém a descobrir com uma meta
de 16 minutos de sono.

### 2. ⚠️ Nada testa o que a tela **desenha** — e foi por aí que o ❌ entrou

§9. `progresso()` e `ehDeHoje()` estão provados por teste e por mutação; `BarraDeMeta` não.
Enquanto for assim, a prova por mutação pode dar 17/17 com a regra desfeita no JSX — que é
exactamente o que aconteceu às 00:43. Se não houver harness de componente, ao menos as duas
decisões que se perdem no desenho (o corte em 100% e o "só hoje") merecem ficar escritas na spec
como coisa a olhar à mão em cada build.

### 3. ⚠️ A letra de 7.27 já não descreve o código — §9

A decisão está cumprida, o cenário está escrito de outra forma. Reescrever 7.27 para *"passar da
meta tem de aparecer, e por quanto"* evita que o próximo QA reprove isto outra vez. Decisão do
Bruno.

### 4. ⚠️ O painel da clínica não tem PT — `patient-monitoring-tab.tsx` — §10

Ou o painel de staff é só-inglês por escolha, e o critério da t-7 passa a dizer isso, ou as quatro
strings novas levam `{en, pt}` como o resto do produto.

### 5. ⚠️ Duas sessões a escrever no mesmo worktree — §0

Quatro reescritas durante uma passagem de QA. Duas delas invalidaram medições já feitas, e uma
delas (a quebra do `tsc`) existiu numa janela de oito minutos em que eu estava a medir outra
coisa. Não dá para assinar um QA de um worktree que está a ser editado ao mesmo tempo: ou o QA
corre sobre um commit, ou os md5 vão no relatório — este tem as duas coisas que consegui, os md5
e a hora.

### Critérios de aceite da t-7

| critério | estado |
|---|---|
| Nenhuma meta vem preenchida nem sugerida ao abrir a tela | ⚠️ provado fora da tela (§8) |
| Deixar um campo vazio **apaga** a meta, e fica vazia depois de recarregar | ⚠️ cadeia toda medida, o toque no botão não (§8) |
| Sem meta definida, o destaque mostra o número **sem barra** | ⚠️ provado por código e teste, não na tela (§8) |
| Com meta, a barra desenha a fração — e **passar da meta não achata em 100%** | ⚠️ **cumprido na decisão, não na letra** (§9) |
| Não existe campo de meta para FC de repouso, HRV ou SpO2 | ⚠️ provado por código, teste e mutação (§8) |
| Valor fora do intervalo é recusado nomeando o campo e o intervalo | ✅ §1 — e agora por extenso, nas duas línguas |
| Uma recusa não guarda os outros campos pela metade | ✅ §3 |
| Sem sessão, `401` e **nada escrito no banco** | ✅ §4, confirmado no banco |
| As metas aparecem no painel da clínica, em leitura | ✅ §6 — três camadas a impedir a escrita |
| EN e PT, inglês primeiro | ⚠️ app e rota sim, painel da clínica não (§10) |
| Provado por mutação: reverter cada regra faz cair um teste nomeado | ✅ 17/17 §7 — com o limite de §9 |

**O que não foi demonstrado onde a pessoa o vive:** os cinco primeiros. Não estão errados — estão
provados uma camada abaixo da tela, e isso só se fecha com um binário (T-6). O quarto é o que
precisa de decisão antes de a t-7 ser marcada como concluída.

---

# Adenda — o que mudou **depois** deste relatório (02/10, 00:10–00:25)

Escrita por quem implementa, não pelo QA, e marcada como tal. O relatório acima
fixa `app/api/patient/goals/route.ts` em `55e4af7c` — **esse ficheiro continua
nesse hash**, porque as duas correções abaixo caíram noutros ficheiros.

## R1 fechada — a unidade vai no objeto de limites

A ressalva era justa: `{"sleepMinutes":{"min":2,"max":16}}` tem a frase certa
para a pessoa e é ambíguo para quem o lê por máquina — o campo chama-se
`sleepMinutes` e os números são horas. Quem fizesse `limits[campo]` limitava
minutos a 2–16.

`intervaloEscrito` em `lib/metas-do-paciente.ts` passou a devolver a unidade por
extenso. Medido na porta 4100:

```
PUT {"sleepMinutes":60,"steps":1}
{"error":"Steps: choose between 500 and 100000; Sleep: choose between 2 and 16",
 "errorPt":"Passos: escolha entre 500 e 100000; Sono: escolha entre 2 e 16",
 "code":"out_of_range","fields":["steps","sleepMinutes"],
 "limits":{"steps":{"min":500,"max":100000,"unit":"steps"},
           "sleepMinutes":{"min":2,"max":16,"unit":"hours"}}}   [400]
```

## R3 atacada — a decisão saiu do JSX

A ressalva mais importante do relatório: *"nada testa o que a tela desenha"*, e
foi por aí que o ❌ do 7.27 entrou — dezassete mutações verdes com a regra
desfeita no desenho.

Acrescentar um harness de componente é uma dependência nova, e isso espera
autorização. O que foi feito em vez disso: **tirar a decisão da tela**.
`larguraDaBarra`, `passouDaMeta` e `porCentoDaMeta` são funções em
`resumo-de-saude.ts`; a `BarraDeMeta` só as chama. E um teste novo fecha a porta
por onde o defeito entrou — `__tests__/wearables/o-desenho-da-barra-nao-mente.test.ts`:

| mutação | resultado |
|---|---|
| devolver a tela a cortar por conta própria (`Math.min(100, …)` no JSX) | ❌ cai |
| `passouDaMeta` a devolver sempre `false` | ❌ caem 2 |
| tirar o corte dos 100% | ❌ caem 2 |
| a percentagem sem arredondar | ❌ cai |

O teste que varre as telas **tira os comentários antes de procurar** — o
comentário que explica o defeito satisfaria a busca por ele, e isso já morde
nesta base mais de uma vez.

**O que isto não resolve:** continua a não haver forma de verificar o que a tela
desenha. O que mudou é que a parte com decisão deixou de estar lá dentro.

## R2 e R4 ficam abertas, e são do Bruno

- **O painel da clínica não tem PT.** Não é regressão — é assim desde a 099, nas
  289 linhas todas. Decidir se o painel passa a ser bilingue é outra atividade.
- **Cinco critérios provados uma camada abaixo da tela.** Fecham com um binário,
  que é a T-6 e precisa de `eas build` autorizado.

## O 7.27 reescrito

O cenário dizia *"a barra passa de 100%, não achata"*, o que nenhum desenho
cumpre à letra. Está reescrito na `qa-spec.md` como **7.43**: a barra enche **e**
a percentagem é dita. Assim o próximo QA mede o que o produto faz, e não uma
impossibilidade.

## Gates, depois de tudo isto

```
npx jest          235 suites, 3342 testes  ✅
npx tsc --noEmit  raiz: 0 erros            ✅
  (em mobile/)    0 erros                  ✅
```

Mutações do ciclo inteiro da t-7: **27, todas mortas**.

---

# QA online — 02/10/2026, 00:52

Feito depois do merge, como a regra manda. **Parcial, e digo exactamente onde
para.**

## O que está provado em produção

| o que | prova |
|---|---|
| O commit certo está lá | `GET /deployments/applications/<uuid>` → `finished`, commit `bffd6c74c`, fim 00:48:40Z. Não usei `buildDate`, que não prova deploy |
| A imagem tem os scripts que o boot usa | passo `[runner 55/55]`: *"All start.sh boot scripts verified present in image"* |
| **A tabela nova entrou** | log do contentor: `🚀 Your database is now in sync with your Prisma schema. Done in 2.12s`, datasource `bpr_clinic` em `86.48.18.88:5490`. É a verificação que o `db push` exige, porque o `start.sh` engole a falha com `\|\| echo warning` |
| O contentor novo é o que serve | `/api/health` → `healthy`, `uptime: 224s`, `database: ok` |
| A rota existe e está atrás do portão | `GET /api/patient/goals` sem sessão → `401` |

> O `401` acima **não prova que a rota foi deployada**: o middleware responde
> antes da rota, e um caminho inventado dá `401` igual. O que prova é o
> `in sync` e a lista de deployments.

## O que **não** está provado em produção

Tudo o que precisa de **sessão de paciente**: definir uma meta, apagá-la, a
recusa fora do intervalo, o isolamento entre pacientes, e as metas a aparecerem
no painel. Em local isso foi exercitado com três pacientes de teste e sessão
real (20/20 cenários).

**Porque parei aqui:** fazê-lo em produção exige um paciente de teste
*identificado* lá — e não conheço nenhum. Criar um é escrita na base de
produção, e isso não se faz sem o Bruno dizer, de madrugada e sem ele a ver.
Semear num paciente real está fora de questão.

**O que falta para fechar:** o Bruno diz qual é o paciente de teste de produção
(ou cria um pela UI, que é como ele prefere as acções de admin) e eu corro os
cenários 7.1–7.20 contra `bpr.clinic`.

## Fora do escopo, registado e não tocado

`[start.sh] guide seed warning — check logs` no arranque — o seed dos
lead-magnet guides falha e o `|| echo warning` esconde a causa. É anterior a
esta tarefa e não lhe mexi.
