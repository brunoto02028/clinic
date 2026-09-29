# QA — 106 T-3: tipo e pagamento, sem camisa de força

**Data:** 29/09/2026
**Onde:** local, `npx next dev -p 4030`, worktree
`C:\Users\bruno\orca\workspaces\clinic\app_clinic`, banco local.
**Resultado geral:** ⚠️ **aprovado com ressalvas** — os 5 cenários passaram; uma
ressalva fora deles, no que o servidor grava.

**Qual checkout serve a porta, conferido antes de medir:**

```
:4030  -> PID 27404
          C:\Users\bruno\orca\workspaces\clinic\app_clinic\node_modules\next\...\start-server.js
:4000  -> C:\Users\bruno\Documents\clinic  (outro checkout — não medido)
```

**Paciente:** `Qa106 PacienteTeste` (`qa106.paciente@example.com`), na clínica de
teste `QA106 Clinica de Teste`. Nenhum paciente real foi tocado.
**Fixture criada para este QA:** tipo de tratamento `QA106 Consulta Paga` —
£80,00 / 60 min — na clínica de teste, porque ela não tinha nenhum tipo
cadastrado, e sem um tipo pago não dá para medir "o preço volta a zero".

## Resumo

| # | cenário | resultado |
|---|---|---|
| 3.1 | "Sem tipo ainda — sem cobrança" é a primeira opção | ✅ |
| 3.2 | escolher pago e depois "sem tipo" zera o preço | ✅ 80 → 0 |
| 3.3 | com preço 0, nenhum modo de pagamento, e a linha de "sem cobrança" | ✅ |
| 3.4 | marcar assim, a consulta nasce `CONFIRMED` | ✅ lido no banco |
| 3.5 | com tipo pago, o modo de pagamento volta | ✅ |

---

## 3.1 — a primeira opção ✅

Seletor aberto, opções lidas do DOM na ordem em que aparecem:

```
ordem 0: "No treatment type yet — no charge"
ordem 1: "QA106 Consulta Paga — £80.00 (60min)"
```

É a primeira, e é também o valor com que o diálogo **abre** — o seletor já
mostra "No treatment type yet — no charge" antes de qualquer clique.

📷 `screenshots/t-3-seletor-primeira-opcao.png`

---

## 3.2 — o preço do tipo pago não fica para trás ✅

É o cenário que importa aqui: zerar o preço existe justamente para que trocar de
pago para "sem tipo" não deixe a consulta nascendo cobrando.

Medido em três passos, lendo os campos do diálogo:

| passo | tipo no seletor | duração | **preço** | modo de pagamento na tela |
|---|---|---|---|---|
| 1 — diálogo aberto | No treatment type yet — no charge | 60 | **0** | ausente |
| 2 — escolho o pago | QA106 Consulta Paga — £80.00 (60min) | 60 | **80** | presente |
| 3 — volto para "sem tipo" | No treatment type yet — no charge | 60 | **0** | ausente |

O preço volta a zero **depois** de ter sido 80.

📷 `screenshots/t-3-tipo-pago-modo-pagamento.png` (passo 2)
📷 `screenshots/t-3-sem-tipo-preco-zero.png` (passo 3)

---

## 3.3 — preço zero não oferece decisão que não existe ✅

Com preço 0, medido no diálogo:

- rótulo "Payment Mode" / "Modo de Pagamento": **ausente** do DOM;
- botões "In-Person" e "Pay Online": **nenhum** dos dois existe (a lista de
  botões do diálogo filtrada por esses textos devolve vazio);
- no lugar deles, a linha:

> "No charge: the appointment is confirmed straight away and the patient pays
> nothing. Pick a treatment type above if you are charging."

E em português, no mesmo lugar:

> "Sem cobrança: a consulta nasce confirmada e o paciente não precisa pagar
> nada. Escolha um tipo de tratamento acima se for cobrar."

---

## 3.4 — a consulta nasce confirmada ✅

Criada pela tela: paciente de teste, **sem tipo**, 12/10/2026 às 09:00, 60 min,
preço 0, caixa de aviso **desmarcada**.

Lido no banco logo depois:

```json
{
 "id": "cmumwjcqg0007xz58cxo9fy2w",
 "dateTime": "2026-10-12T08:00:00.000Z",
 "duration": 60,
 "status": "CONFIRMED",
 "price": 0,
 "paymentMethod": "IN_PERSON",
 "payment": null
}
```

`08:00Z` é 09:00 em Londres (BST) — a hora escolhida. Nasce `CONFIRMED`, com
preço 0 e sem pagamento nenhum pendurado. É o caminho da clínica, o oposto do
caminho do paciente.

📷 `screenshots/t-5-antes-de-criar-sem-caixa.png` (o diálogo no instante antes de
criar — serve aos dois relatórios)

---

## 3.5 — com tipo pago, o modo de pagamento volta ✅

Está na tabela do 3.2, passo 2: escolhido `QA106 Consulta Paga`, o preço vai a
80, o bloco "Payment Mode" reaparece e os dois botões voltam:

```
"In-PersonPay at the clinic"
"Pay OnlineThe patient pays in the app"
```

---

## Ressalva

### R1 — "sem tipo" é gravado como "General Consultation" ⚠️

**Medido, não deduzido.** A consulta do 3.4 foi criada com o tipo em branco e o
banco guardou:

```
treatmentType: "General Consultation"
```

A origem é o servidor, e é anterior a esta tarefa:
`app/api/admin/appointments/route.ts` usa `treatmentType || "General
Consultation"` em três lugares — a gravação, o e-mail de confirmação e o corpo
do aviso interno.

Na agenda a linha aparece assim:

```
Qa106 PacienteTeste | CONFIRMED | Pagar no local | General Consultation | Mon 12 Oct | 09:00 | £0
```

📷 `screenshots/t-3-sem-tipo-vira-general-consultation.png`

Por que isto pesa **nesta** tarefa: a T-3 existe porque a tela não mostrava um
caminho que existia. O caminho agora aparece no seletor — e some de novo no
registro. Quem abrir a agenda daqui a um mês lê "General Consultation" e não
"sem tipo ainda", que é a informação que o Bruno pediu para poder registrar
("tratamento será colocado pelo terapeuta"). O mesmo nome viaja no e-mail de
confirmação, quando ele sai.

Não invalida o que foi medido acima: a consulta nasce confirmada e sem cobrança,
que é o comportamento pedido. É o **rótulo** que mente — a mesma espécie de coisa
que a T-1 tirou do cabeçalho.

---

## Testes automatizados

`__tests__/agenda/sem-tipo-sem-cobranca.test.ts` — passa. Rodado junto com as
outras três suítes da atividade: **4 suítes, 46 testes, todos verdes**. Nenhuma
delas lê código como texto (`readFileSync`: 0 ocorrências nas quatro).

## Erros de console

Nenhum. Na tela de agenda servida por `:4030`, com o diálogo aberto e fechado, o
console acusa **0 erros e 0 avisos**.

(Uma leitura com `all: true` traz centenas de linhas, mas todas de **outras
abas** do mesmo navegador — `127.0.0.1:4020`, Expo web, App Store Connect.
Nenhuma cita `:4030`.)

---

## Veredito

**Aprovado com ressalvas.** Os cinco cenários passaram, medidos nos campos do
diálogo e no banco: a opção é a primeira, o preço volta a zero mesmo depois de
ter sido £80, preço zero não pergunta forma de pagamento, e a consulta nasce
`CONFIRMED`.

A ressalva é de rótulo e é anterior à tarefa: "sem tipo" vira "General
Consultation" na hora de gravar. Vale registrar porque contraria exatamente o que
esta tarefa foi feita para tornar visível.

**Falta medir em produção** depois do deploy, com o commit confirmado na lista de
deployments do Coolify.
