# T-9: Onde a consulta acontece, dito uma vez só

**Status:** 🟢 concluída (29/09) — QA aprovado (L1–L5 + extra)
**Depende de:** T-7, T-8 (as três rotas que escrevem a frase)
**Origem:** achado nº 1 da terceira rodada de QA. O primeiro é **efeito da minha
própria mudança de hoje**.

## O que o QA viu

No e-mail de remarcação:

```
📅 Date Thursday, 14 January 2027 🕐 Time 14:00 📍 Location 👨‍⚕️ Therapist Qa106 AdminTeste
```

Um rótulo com nada depois. A rota `/reschedule` nunca passou `location`, e o
filtro que eu acrescentei hoje — o que remove `{{…}}` não preenchido para a
chave crua não chegar ao paciente — fez a variável **desaparecer** em vez de
vazar. O objetivo era esse; mas aqui o que sobra não é uma linha faltando, é um
rótulo órfão. Quem remarca precisa de saber para onde ir.

## O que eu fiz além do que foi pedido, e por quê

Três rotas escreviam essa frase, cada uma à sua maneira. Ao extrair o helper para
`lib/appointment-location.ts` — terceiro lugar a precisar dele — a versão do
`PUT` ficou ao lado, e ela **farejava a palavra "domicílio" no texto livre das
anotações**:

```ts
const isHomeVisit = /domicil|home[\s-]?visit|casa da paciente|patient'?s home/i
  .test(appointment.notes || '');
```

Isso é de quando não havia onde registar o formato. O campo `mode` existe desde a
atividade 089. Uma visita domiciliar marcada **corretamente**, com as notas
vazias, recebia no e-mail o endereço **da clínica** — a pessoa saía de casa
enquanto o terapeuta ia à casa dela.

O Bruno não pediu isto; eu tinha registado como aberto na T-7 e fiz. A razão: o
helper estava na minha mão, o defeito manda um paciente para o lugar errado, e
era no mesmo bloco que eu já havia editado hoje. Fica dito explicitamente que foi
um passo além do escolhido.

## O que ficou

`lib/appointment-location.ts`, usado pelas três:

| rota | antes | agora |
|---|---|---|
| `POST /api/admin/appointments` | cópia local, correta | o helper |
| `PUT /api/appointments/[id]` | regex nas notas | o helper |
| `POST /api/appointments/[id]/reschedule` | **não passava nada** | o helper |

Uma mudança de comportamento a mais: sem inquilino resolvido o helper devolve o
nome da casa e **não vai ao banco** procurar endereço. Inventar endereço por
falta de dado é o pior desfecho possível — manda alguém para o lugar errado com
uma frase que parece certa.

## Critérios de aceite

- [x] Domicílio diz o endereço do paciente, com as notas vazias
- [x] Domicílio sem endereço cadastrado continua sendo a casa dele
- [x] Vídeo não consulta o banco e aponta para o app
- [x] Presencial diz a casa e o endereço
- [x] Sem inquilino, o nome da casa e nenhuma consulta ao banco
- [x] A remarcação passa a dizer o local

## Provas

`__tests__/agenda/onde-a-consulta-acontece.test.ts` — 11 cenários.

**Por mutação:** trocado o reconhecimento de domicílio por `if (false)` — o
estado em que o regex ficava com as notas vazias —, **4 testes falham**.

Suíte completa: **2817 testes, 189 suítes, verdes.** `tsc --noEmit` em 0.
`NEXT_DIST_DIR=.build npm run build`: compilou.

## O que fica em aberto

- **Nenhum `APPOINTMENT_RESCHEDULED`.** A remarcação usa o modelo de
  confirmação: assunto *"Appointment Confirmed ✅"*, corpo *"has been
  successfully booked"*, e **só a hora nova** — o horário antigo existe apenas no
  texto de SMS/WhatsApp, que localmente nem chega. Quem foi remarcado lê uma
  marcação nova. Mesma família do texto que mentia na T-1, agora em dois lugares.
- **A lista de avisos do app fica muda sem `mod_appointments`.** O paciente de
  teste tinha 4 consultas nos próximos 7 dias e **zero** avisos; o QA precisou de
  `fullAccessOverride` para alcançar o código. Não é defeito destas correções, e
  não foi mexido.
- **"Sempre no app e e-mail" é, na prática, "sempre e-mail, e app quando há
  aparelho".** O `forceChannel` garante a carta; o push depende de um
  `PushDeviceToken`. A promessa está cumprida no que se pode garantir — mas não
  se leia "os dois" como "os dois chegam sempre".
- **Os 4 caminhos internos** com o defeito de fuso da T-8.
- **19 links de e-mail apontam para `/dashboard/*` na web**, que perde acesso
  quando o app lançar.


---

## QA na tela — 29/09/2026, servidor em `TZ=UTC`

**L1–L5 e o extra: os seis passam.** Notas confirmadas `null` **antes e depois**
de cada medição — sem isso o cenário não discrimina, porque o regex antigo
acertava quando a palavra estava escrita.

Um segundo discriminador, positivo em vez de negativo: o código antigo, **quando**
detectava domicílio, escrevia a string literal `Home visit / Visita domiciliar` —
nunca um endereço. Varridos os seis e-mails, a frase está **ausente em todos**.
O que saiu não veio de nenhum ramo do código velho.

| cenário | `mode` | `📍 Location` no corpo |
|---|---|---|
| **L2** domicílio, notas vazias | `HOME_VISIT` | `At your address — 5 Far Away Road, Ipswich, IP1 3QJ` |
| **L3** controle, a **mesma** consulta virada | `IN_PERSON` | `QA106 Clinica de Teste — 1 Clinic Street, London` |
| **L4** vídeo | `VIDEO` | `Video consultation — a link opens in your app` |
| **L1** remarcação presencial | `IN_PERSON` | `QA106 Clinica de Teste — 1 Clinic Street, London` |
| **L5** remarcação de domicílio | `HOME_VISIT` | `At your address — 5 Far Away Road, Ipswich, IP1 3QJ` |
| **extra** domicílio sem endereço | `HOME_VISIT` | `At your address` — seco, e não a clínica |

### O par que prova, e por que é um par

L2 e L3 são **a mesma consulta**, com **as mesmas notas vazias**, mudando **só o
`mode`** — e dão dois endereços diferentes, os dois certos. Sozinho, o L2 passaria
com um helper que devolvesse a casa do paciente sempre; sozinho, o L3 passaria com
um que devolvesse a clínica sempre. Juntos, fecham.

### O L1, antes e depois

```
antes:  📅 Date Thursday, 14 January 2027 🕐 Time 14:00 📍 Location 👨‍⚕️ Therapist Qa106
depois: 📍 Location QA106 Clinica de Teste — 1 Clinic Street, London 👨‍⚕️ Therapist Qa106
```

### O extra, que era o desfecho perigoso

Com `address`, `city` e `postcode` do paciente zerados (confirmado no banco antes
de medir), a frase é exatamente `At your address` e **não menciona a clínica**.
Cair no endereço da clínica ali seria o pior resultado possível: a frase pareceria
completa e mandaria a pessoa para a rua.

Console: **0 erros**. Log do servidor: **0** linhas de erro. Nenhum achado novo.

## Placar das quatro rodadas

| rodada | cenários | ✅ | ❌ |
|---|---|---|---|
| A–E — as 17 correções | 23 | 22 | 1 (D19) |
| N1–N9 — o envio opt-in | 9 | 9 | 0 |
| T1–T6 + 2 controles — o fuso e a fila | 8 | 8 | 0 |
| L1–L5 + 1 extra — o lugar | 6 | 6 | 0 |
| **total** | **44** | **44** | **0** |

O único ❌ da sessão foi corrigido e re-verificado com três cenários e um controle
negativo.
