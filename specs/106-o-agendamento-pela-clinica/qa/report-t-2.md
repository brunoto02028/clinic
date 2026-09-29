# QA — 106 T-2: a duração ocupa o horário

**Data:** 29/09/2026
**Onde:** local, `npx next dev -p 4010`, worktree
`C:\Users\bruno\orca\workspaces\clinic\app_clinic`, banco local.
**Resultado geral:** ⚠️ **aprovado com ressalvas** — os 5 cenários da spec
passaram, todos medidos em pixels. Duas ressalvas nas bordas da grade, nenhuma
delas nos cenários pedidos.

**Paciente:** `Qa106 PacienteTeste` (`qa106.paciente@example.com`), na clínica
de teste `QA106 Clinica de Teste`. Nenhum paciente real foi tocado.
**Como medi:** `getBoundingClientRect()` de cada bloco, no navegador, mais
`document.elementFromPoint()` para provar que nenhum bloco está escondido
atrás de outro. Nada foi julgado a olho.

## A régua, medida antes de tudo

A implementação diz 56px por hora. A tela concorda: os topos das linhas de hora
consecutivas, medidos, ficam a **exatamente 56px** um do outro.

| linha | topo medido | delta |
|---|---|---|
| 08:00 | 324 | — |
| 09:00 | 380 | 56 |
| 10:00 | 436 | 56 |
| 13:00 | 604 | 3 × 56 |
| 14:00 | 660 | 56 |

Então 1 minuto = 56/60 = 0,9333px, e é essa a régua contra a qual tudo abaixo
foi conferido.

## Fixtures

Oito consultas na semana exibida (28/09–04/10/2026), criadas direto no banco
com hora de parede de Londres (BST, UTC+1):

| tag | dia | início | duração |
|---|---|---|---|
| A1 | qui 01/10 | 08:00 | 30 min |
| A2 | qui 01/10 | 09:00 | 60 min |
| A3 | qui 01/10 | **10:38** | 45 min |
| A4 | qui 01/10 | 13:00 | **15 min** |
| B1 | sex 02/10 | 14:00 | 60 min |
| B2 | sex 02/10 | **14:00** | 60 min |
| B3 | sex 02/10 | 10:00 | **90 min** |
| B4 | sex 02/10 | 11:00 | 60 min |

As oito aparecem na tela — contadas no DOM, 8 de 8.
📷 `screenshots/t-2-semana-completa.png`

## Resumo

| # | cenário | resultado |
|---|---|---|
| 2.1 | 60 min tem o dobro da altura de 30 min | ✅ 56px vs 28px |
| 2.2 | consulta às 10:38 começa no minuto certo dentro das 10h | ✅ 35,47px de 56 |
| 2.3 | duas no mesmo horário, as duas visíveis lado a lado | ✅ |
| 2.4 | 90 min às 10:00 + 60 min às 11:00, lado a lado | ✅ |
| 2.5 | consulta de 15 min, nome legível | ✅ 20px, sem corte |
| 2.6 | contador de vagas não contradiz o desenho | ✅ 10 e 11, conferidos à mão |

---

## 2.1 — o dobro, medido ✅

| bloco | duração | **altura medida** | esperado (dur/60 × 56) |
|---|---|---|---|
| A1 | 30 min | **28,00px** | 28,00 |
| A2 | 60 min | **56,00px** | 56,00 |

56 / 28 = **2,000**. O de 60 minutos tem exatamente o dobro da altura do de 30.

Antes os dois desenhavam igual; é a diferença entre um calendário e uma lista
com colunas.

---

## 2.2 — 10:38 não é 10:00 ✅

A3 começa às 10:38 e dura 45 minutos.

```
style top    = 35.4667px        (esperado: 38/60 × 56 = 35.4667)
rect top     = 471.46px
topo da faixa das 10h = 436.00px
offset dentro da faixa = 35.46px
altura da faixa        = 55.33px  (a linha de grade, sem a borda)
altura do bloco        = 42.00px  (esperado: 45/60 × 56 = 42.00)
```

O bloco começa **dentro** da faixa das 10h, a 35,46px do seu topo — 63,3% da
hora, que é onde 38 minutos caem. Erro contra o valor teórico: **0,007px**.

Como 10:38 + 45 min passa das 11:00, o bloco ultrapassa a própria linha de
grade. Conferi que ele continua por cima e não por baixo:
`elementFromPoint` no ponto 3px acima da base do bloco devolve **o próprio
bloco**, não a célula das 11h.

---

## 2.3 — duas no mesmo horário, nenhuma escondida ✅

B1 e B2, as duas às 14:00 de sexta, 60 minutos cada:

| bloco | topo | altura | esquerda | largura | coluna |
|---|---|---|---|---|---|
| B1 | 660,00 | 56,00 | **918,25** | 77,96 | 0 de 2 (`calc(50% - 4px)`) |
| B2 | 660,00 | 56,00 | **1000,21** | 77,96 | 1 de 2 (`calc(50% + 2px)`) |

918,25 + 77,96 = 996,21 < 1000,21 → **4,0px de folga**, zero sobreposição
horizontal. Mesmo topo, mesma altura, lado a lado.

E a prova de que nenhuma está atrás da outra: `elementFromPoint` no centro de
**cada um dos 8 blocos** devolve o próprio bloco. 8 de 8.

---

## 2.4 — 90 minutos às 10:00 e 60 às 11:00 ✅

*O caso que a implementação antiga não pegava: a colisão acontece entre linhas
de hora diferentes, e quem decide é o relógio, não a linha da grade.*

| bloco | início | duração | topo | altura | esquerda | largura | coluna |
|---|---|---|---|---|---|---|---|
| B3 | 10:00 | 90 min | 436,00 | **84,00px** | 918,25 | 77,96 | 0 de 2 |
| B4 | 11:00 | 60 min | 492,00 | 56,00px | **1000,21** | 77,96 | 1 de 2 |

- Altura de B3: 84px = 90/60 × 56. Exato.
- B3 ocupa de 436 a **520**; B4 começa em 492. Eles **se sobrepõem 28px na
  vertical** — o meio da hora das 11h — e é exatamente por isso que a
  implementação os pôs em colunas diferentes.
- B3 nasce na faixa das 10h e B4 na das 11h, `div`s diferentes da grade, e
  ainda assim o layout os reconheceu como conflito.
- `elementFromPoint` 3px acima da base de B3 (já dentro do território das 11h)
  devolve **B3**. Ele não sumiu atrás da linha seguinte.

Encostar não virou conflito: A1 (08:00–08:30) e A2 (09:00–10:00) ficaram os
dois com `width: calc(100% - 4px)` — largura inteira, uma coluna só.

---

## 2.5 — 15 minutos, nome legível ✅

A4, 13:00, 15 minutos. 15/60 × 56 = 14px; o piso de legibilidade entrou:

```
altura do bloco     = 20,00px     (piso, não os 14px do relógio)
texto               = "Qa106 PacienteTeste"
font-size           = 9px
line-height         = 11,25px
altura do parágrafo = 11,25px
padding vertical    = 2px / 2px   → cabe: 11,25 + 4 = 15,25 < 19
cortado na horizontal? scrollWidth 151 = clientWidth 151  → não
cortado na vertical?   scrollHeight 19 = clientHeight 19  → não
cor do texto  rgb(147, 197, 253) sobre rgba(59, 130, 246, 0.2)
```

O nome aparece inteiro, sem reticências e sem corte. E o bloco curto some com
as outras duas linhas (tratamento e hora) em vez de espremer três coisas em
20px — espremer não mostraria três, esconderia as três. A informação que sai
continua acessível no `title` do botão:
`Qa106 PacienteTeste · T2 A4 15min 13:00 · 15 min`.

---

## 2.6 — o contador de vagas concorda com o desenho ✅

O contador vinha de `/api/availability`, que respondeu **HTTP 200**.

| dia | cabeçalho na tela | consultas desenhadas |
|---|---|---|
| seg 28 | *(nada — dia passado)* | — |
| ter 29 | 8 free | — |
| qua 30 | 19 free | — |
| **qui 1** | **10 free** | A1, A2, A3, A4 |
| **sex 2** | **11 free** | B3, B4, B1, B2 |
| sáb 3 | no slots | — |
| dom 4 | no slots | — |

Não aceitei o número da rota como verdade: recalculei os dois à mão, a partir
do que está **desenhado**, com expediente 08:00–18:00 e passo de 30 min (19
horários de 60 min possíveis, das 08:00 às 17:00).

**Quinta** — ocupado por A1 08:00–08:30, A2 09:00–10:00, A3 10:38–11:23,
A4 13:00–13:15. Sobram 11:30, 12:00, 13:30, 14:00, 14:30, 15:00, 15:30, 16:00,
16:30, 17:00 = **10**. A tela diz 10.

**Sexta** — ocupado por B3 10:00–11:30, B4 11:00–12:00, B1 e B2 14:00–15:00.
Sobram 08:00, 08:30, 09:00, 12:00, 12:30, 13:00, 15:00, 15:30, 16:00, 16:30,
17:00 = **11**. A tela diz 11.

Os dois batem. O contador não contradiz o desenho.

Duas observações sobre o contador, ambas corretas e ambas fáceis de ler errado:

- **Segunda 28 não mostra número** embora a rota devolva `livres: 19`. É a
  regra de 095 (8.6): dia que já passou não oferece vaga. Certo.
- **Uma clínica sem expediente configurado mostra "no slots" em todos os
  dias, inclusive num dia cheio de consultas desenhadas.** Vi isso antes de
  configurar o expediente da clínica de teste: quinta e sexta diziam "no
  slots" com quatro blocos cada. Não é defeito da T-2 — a rota devolve
  `fechado: true, motivo: "not_working"`, e "sem vaga" é literalmente
  verdade —, mas é o único jeito de a tela parecer se contradizer, e vale
  saber que existe.

---

## Erros de console

Nenhum. Zero erros e zero warnings. Só Web Vitals e o convite do React
DevTools.

---

## Suíte

`npx jest __tests__/agenda/` → **17 suítes, 299 testes, tudo verde**, incluindo
os 12 casos novos de `__tests__/agenda/a-duracao-ocupa-o-horario.test.ts`.

---

## Ressalvas: as bordas da grade

Sondagens que a qa-spec não pede, feitas na quarta 30/09 com seis consultas
extras. 📷 `screenshots/t-2-bordas-quarta.png`

### R1 — Consulta antes das 08:00 é invisível ⚠️

Uma consulta às **07:00** foi criada e **não aparece na grade**. Contei no DOM:
6 criadas, 5 desenhadas. A grade é `HOURS = 8..19`, e o filtro por linha
(`floor(minutos/60) === hour`) nunca casa com 7.

Isto é anterior à T-2 — a versão antiga filtrava igual. Mas a T-2 existe para
que *"olhar a agenda e ver o que está ocupado"* seja verdade, e um horário
ocupado que não desenha é o mesmo defeito que a tarefa foi consertar, um pouco
mais para a esquerda. Numa clínica que abra às 7h, esse horário não existe na
tela.

O contador, esse, sabe dela: quarta marcou **16 free**, e recalculei à mão —
bate, com a de 07:00 contabilizada (ela não bloqueia nenhum horário de 60 min
a partir das 08:00). Ou seja, contador e desenho discordam sobre a existência
daquela consulta, cada um do seu jeito defensável.

### R2 — Bloco no fim do dia vaza para fora do quadro ⚠️

Uma consulta às **19:30** (60 min) desenha na última linha e **ultrapassa a
borda inferior da grade**:

```
fundo da grade = 996,00px
fundo do bloco = 1024,00px     → 28px para fora
```

Na imagem o bloco aparece cortado ao meio, atravessando a moldura arredondada
do calendário. Uma de 90 min às 18:30 termina exatamente na borda (996,00) e
fica certa.

Isto **é** consequência da T-2: com altura fixa dentro da célula, o bloco nunca
passava da linha; com posicionamento absoluto pela duração, passa. É cosmético
— nada se perde, o bloco continua clicável —, mas é a única coisa que a
mudança piorou visualmente.

### R3 — Com três sobrepostas o nome é cortado (e o `title` salva) ℹ️

Três consultas às 16:00 no mesmo dia: as três aparecem, em terços
(`calc(33.3333% - 4px)`, 57,30px cada), lado a lado, nenhuma escondida
(`elementFromPoint` confirma as três).

O nome, porém, é truncado: `scrollWidth > clientWidth` nas três — a tela mostra
"Qa106 P…". Já acontece com **duas** colunas (B3/B4, 77,96px: "Qa106
Paciente…"). O critério 2.5 é sobre a consulta de 15 minutos e passou; este é
outro caso, e a T-2 já trouxe a mitigação certa — o `title` de cada bloco traz
nome, tratamento e duração inteiros ao passar o mouse.

### R4 — O dia é agrupado pelo relógio do navegador, a hora pelo da clínica ℹ️

**Não medido — leitura de código, declarado como hipótese.**

`apptsByDay` agrupa por `new Date(a.dateTime).toDateString()`, que é a data no
fuso do **navegador**; o filtro da linha de hora usa
`getZonedMinutesOfDay(...)`, que é o fuso da **clínica**. Neste QA o navegador
estava em `Europe/London` (medido:
`Intl.DateTimeFormat().resolvedOptions().timeZone === "Europe/London"`), então
os dois coincidem e nada aparece.

Num navegador em outro fuso — o do Bruno no Brasil, por exemplo — uma consulta
perto da meia-noite cairia na coluna de um dia e na linha de hora de outro. Não
consegui reproduzir sem trocar o fuso do navegador, então fica registrado como
suspeita, não como falha.

---

## Veredito

**Aprovado com ressalvas.** Os cinco cenários da qa-spec passaram, todos com
número em pixels: o dobro é exatamente o dobro, 10:38 cai a 35,47px dentro da
faixa das 10h, as sobrepostas ficam lado a lado — inclusive entre horas
diferentes, que era o caso difícil —, e o bloco de 15 minutos mantém o nome
inteiro. O contador de vagas confere com o desenho nos dois dias, recalculado à
mão.

As ressalvas são de borda: o que está fora da faixa 08:00–19:00 some (R1,
anterior à tarefa) e o que começa perto das 19:30 vaza para fora do quadro (R2,
introduzido pela tarefa). Nenhuma das duas invalida a entrega.

**Falta medir em produção** depois do deploy, com o commit confirmado na lista
de deployments do Coolify.
