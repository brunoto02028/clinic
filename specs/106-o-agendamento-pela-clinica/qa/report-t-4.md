# QA — 106 T-4: a agenda começa às oito

**Data:** 29/09/2026
**Onde:** local, `npx next dev -p 4030`, worktree
`C:\Users\bruno\orca\workspaces\clinic\app_clinic`, banco local.
**Resultado geral:** ⚠️ **aprovado com ressalvas** — os 5 cenários passaram; duas
ressalvas, uma delas sobre o que a tarefa promete e o servidor não cobra.

**Qual checkout serve a porta:** `:4030` → PID 27404, em
`...\app_clinic\node_modules\next\...\start-server.js`. A `:4000` é servida por
`C:\Users\bruno\Documents\clinic`, outro checkout, e não foi medida.

**Paciente:** `Qa106 PacienteTeste` (`qa106.paciente@example.com`), clínica
`QA106 Clinica de Teste`. Nenhum paciente real foi tocado.

**Fixture de agenda criada para este QA** — a clínica de teste não tinha janela
nenhuma configurada, então não havia como medir "dia fechado" nem "dia curto".
`TherapistAvailability` do profissional que a rota resolve (o admin da clínica, o
mais antigo do inquilino, que é quem `findTherapist` devolve quando ninguém passa
um id):

| dia | janela |
|---|---|
| domingo | **fechado** |
| segunda | 09:00–17:00 |
| terça | 09:00–**15:00** (dia curto, de propósito) |
| quarta a sexta | 09:00–17:00 |
| sábado | **fechado** |

Intervalo de slot: 30 min (o padrão, sem `SLOT_INTERVAL_MINUTES` no banco).

## Resumo

| # | cenário | resultado |
|---|---|---|
| 4.1 | os horários da tela batem com `/api/availability?date=&duration=` | ✅ 15 de 15, idênticos |
| 4.2 | mudar a duração para 90 muda a lista | ✅ 15 → 14, some o 16:00 |
| 4.3 | dia em que a clínica não atende | ✅ mensagem + campo desabilitado |
| 4.4 | trocar para uma data que não tem a hora escolhida | ✅ a hora é limpa |
| 4.5 | consulta às 07:00 criada por API | ✅ a grade estica e a desenha |

---

## 4.1 — a tela e a API dizem a mesma coisa ✅

Data 12/10/2026 (segunda), duração 60. Lista lida do DOM do seletor, e a mesma
pergunta feita à API **do próprio navegador**, na mesma sessão:

```
GET /api/availability?date=2026-10-12&duration=60  ->  HTTP 200
{"slots":["09:00","09:30","10:00","10:30","11:00","11:30","12:00","12:30",
          "13:00","13:30","14:00","14:30","15:00","15:30","16:00"],
 "available":true,"workingHours":{"start":"09:00","end":"17:00"}}
```

| | |
|---|---|
| itens no seletor | **15** |
| itens na API | **15** |
| comparação item a item das duas listas | **idênticas** |

Note o que **não** está na lista: 08:00 e 08:30, que a lista escrita à mão
oferecia e que esta clínica não atende. E 16:30/17:00, que não cabem numa
consulta de 60 min terminando às 17:00.

📷 `screenshots/t-4-horarios-60min.png`

**Prova extra, de graça:** depois de criar a consulta das 09:00 (60 min), abri o
seletor de novo para a mesma data e ele passou a começar em **10:00** — 09:00 e
09:30 sumiram sozinhos, porque agora estão ocupados. A lista lê a agenda de
verdade, não uma constante.

---

## 4.2 — 90 minutos não cabem onde 30 cabiam ✅

Mesma data, duração alterada de 60 para 90 no campo do diálogo:

| duração | itens | último horário |
|---|---|---|
| 60 | 15 | 16:00 |
| **90** | **14** | **15:30** |

A diferença é exatamente um item: 16:00. `09:00 + 90min = 10:30` cabe;
`15:30 + 90min = 17:00` cabe; `16:00 + 90min = 17:30` não cabe, e some. A lista
da tela é idêntica à da API para `duration=90`.

📷 `screenshots/t-4-horarios-90min.png`

---

## 4.3 — dia fechado diz que está fechado ✅

Data 11/10/2026 (domingo). Medido no diálogo:

```
campo de hora, texto     : "No free time on this day"
campo de hora, disabled  : true   (atributo disabled presente, e data-disabled="")
mensagem abaixo do campo : "The clinic is not open on this day, or the diary is
                            already full."
```

E a API concorda:

```
GET /api/availability?date=2026-10-11&duration=60  ->  HTTP 200
{"slots":[],"available":false,"reason":"not_working"}
```

Antes disto, a lista escrita à mão ofereceria as mesmas 20 opções de 08:00 a
17:30 num domingo fechado.

📷 `screenshots/t-4-dia-fechado.png`

---

## 4.4 — a hora escolhida é limpa quando não existe no dia novo ✅

Feito na ordem em que uma pessoa faria:

1. data 12/10 (segunda, até 17:00), duração 60 → escolho **16:00**.
   Campo de hora lido: `"16:00"`.
2. troco a data para 13/10 (terça, a do dia curto, até 15:00).
3. campo de hora lido de novo: `"Select time..."` — **vazio**.

E o motivo está na API da data nova:

```
GET /api/availability?date=2026-10-13&duration=60  ->  HTTP 200
{"slots":[...,"14:00"],"available":true,"workingHours":{"start":"09:00","end":"15:00"}}
```

16:00 não está na lista da terça (o último é 14:00), e por isso foi apagado. Sem
isso, o campo mostraria 16:00 e o envio marcaria num horário que a própria tela
já não oferece.

📷 `screenshots/t-4-hora-limpa-ao-trocar-data.png`

---

## 4.5 — a grade estica e desenha as 07:00 ✅

Consulta criada **por API**, fora da janela da clínica de propósito:

```
POST /api/admin/appointments  ->  HTTP 200
{"id":"cmumwn586000lxz580tzlcvog","dateTime":"2026-10-12T06:00:00.000Z",
 "duration":60,"treatmentType":"QA106 T4 sete-da-manha","status":"CONFIRMED"}
```

06:00Z = **07:00** em Londres (BST).

Grade semanal de 12–18/10/2026, rótulos da coluna de horas lidos do DOM:

```
07:00  08:00  09:00  10:00  11:00  12:00  13:00
14:00  15:00  16:00  17:00  18:00  19:00  20:00
```

A faixa padrão é 08:00–19:00. Ela começa em **07:00**.

E o bloco está desenhado no lugar certo, medido em pixels:

| | |
|---|---|
| topo do rótulo "07:00" | **427** |
| topo do bloco das 07:00 | **427** |
| altura do bloco | **56px** (60 min, a 56px por hora) |
| style do bloco | `top: 0px; height: 56px; left: calc(0% + 2px); width: calc(100% - 4px)` |

Espaçamento entre rótulos de hora consecutivos: 56px exatos (427, 483, 539, …,
1155). A régua é a mesma que a T-2 mediu.

**Nenhuma consulta do dia fica sem representação:** o banco tem 9 consultas em
12/10 na clínica de teste, e a grade desenha **9 blocos**.

📷 `screenshots/t-4-grade-esticada-0700.png`

---

## Ressalvas

### R1 — a restrição é só da tela; o servidor aceita qualquer horário ⚠️

**Medido.** O `POST /api/admin/appointments` do 4.5 marcou uma consulta às 07:00
num dia em que a clínica abre às 09:00, e respondeu **HTTP 200**. Não há
validação de disponibilidade no servidor.

A resposta do Bruno na tarefa foi *"somente horários disponíveis podem ter
agendamento"*. O que existe hoje é: **somente horários disponíveis são
oferecidos**. São coisas diferentes, e a diferença aparece em qualquer chamador
que não seja este diálogo — o app, um script, uma versão antiga da tela.

Não é regressão: nunca houve validação. E a própria tarefa chama o item 4
(esticar a faixa) de "rede", o que reconhece que o buraco continua aberto. Fica
registrado porque o critério de aceite está escrito como se a porta tivesse sido
fechada, e ela foi só escondida.

### R2 — a faixa é global, não da semana que está na tela ℹ️

**Medido.** A grade da semana de **12–18/10** vai até **20:00**, embora a
consulta mais tarde daquela semana seja às 16:00. As 20:00 vêm de uma consulta
das **19:30 de 30/09** — outra semana —, porque a faixa é calculada sobre todas
as consultas carregadas, não sobre as da semana exibida.

Efeito: linhas de hora vazias em semanas que não precisam delas, e uma grade mais
alta do que precisaria. Nada se perde e nada fica escondido — é o contrário do
defeito que a tarefa corrige. Cosmético, anotado só para não parecer inexplicável
a quem olhar depois.

---

## Testes automatizados

`__tests__/agenda/so-horario-disponivel.test.ts` — passa, junto com as outras três
suítes da atividade: **4 suítes, 46 testes, todos verdes**.

## Erros de console

Nenhum na tela servida por `:4030` — **0 erros e 0 avisos**, tanto na lista
quanto no calendário.

---

## Veredito

**Aprovado com ressalvas.** Os cinco cenários passaram, e os dois que mais
importam foram medidos contra a fonte, não contra a aparência: a lista da tela é
idêntica, item a item, à resposta de `/api/availability` para a mesma data e
duração, e muda quando a duração muda. O dia fechado responde no campo, e não
depois de marcar. A hora que não existe no dia novo é apagada. E a consulta das
07:00 — a que sumia e virou esta tarefa — aparece, alinhada ao pixel com o rótulo
da sua hora.

A ressalva que conta é a R1: o servidor continua aceitando horário fora da
agenda. A tela deixou de oferecer; a rota não deixou de aceitar.

**Falta medir em produção** depois do deploy, com o commit confirmado na lista de
deployments do Coolify.
