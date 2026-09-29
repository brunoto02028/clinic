# T-7: Salvar uma edição não avisa o paciente sozinho

**Status:** 🟢 concluída (29/09)
**Depende de:** T-5 (a caixa da criação, que é o modelo copiado aqui)
**Origem:** achado nº 1 do `qa/report-antes-do-deploy.md` — não estava planeado.

## Objetivo

Fazer o caminho de **edição** obedecer à regra que o de **criação** já obedece:
nada sai para o paciente sem alguém pedir.

## O que estava acontecendo

O QA abriu o diálogo *Edit Appointment*, **não mudou nada**, clicou em *Save
Changes* — e o paciente recebeu e-mail e push:

```
subject : Appointment Confirmed — Tuesday, 20 October 2026
texto   : … your appointment has been successfully booked …
```

`PUT /api/appointments/[id]` chamava `pushConsulta` e `notifyPatient`
**incondicionalmente** para qualquer staff. Sem caixa, sem `sendConfirmation`,
sem prévia. Contradizia a regra da casa de 17/09/2026, que as T-1 e T-5
construíram — no caminho de criação. O de edição nunca foi fechado.

E a correção nº 14 da mesma leva aumentava a exposição: ela faz o diálogo de
edição abrir certo a partir do calendário, e quem antes desistia diante de um
campo em branco agora corrige um preço e manda, sem saber, uma "confirmação"
nova sobre uma consulta antiga.

## O que o QA não tinha pego, e era pior

O assunto do e-mail só troca no cancelamento:

```ts
const slug = isCancellation ? "APPOINTMENT_CANCELLED" : "APPOINTMENT_CONFIRMATION";
```

Então marcar a consulta de ontem como **atendida** — ou como **falta** — passava
por aqui igual e mandava ao paciente *"has been successfully booked"*. Fechar o
atendimento virava uma marcação nova aos olhos de quem recebia.

## Decisão do Bruno

Opt-in, igual à criação. Perguntado entre três caminhos, escolheu o que aplica a
regra existente à rota que ficou de fora, com a caixa marcada por padrão quando
a data ou a hora mudaram.

## O que foi feito

**`app/api/appointments/[id]/route.ts`**

```ts
const ePaciente = userRole === "PATIENT";
const avisarOPaciente = ePaciente || pediramEnviarAoPaciente(body?.notifyPatient);
```

`pediramEnviarAoPaciente` é o mesmo predicado da criação — o campo **ausente**
não envia, e a string `"true"` que um formulário manda envia.

**A exceção, deliberada:** o paciente que cancela a própria consulta continua
recebendo o e-mail sem precisar de pedir. É o recibo do próprio ato, o push para
ele já não saía, e exigir o pedido ali silenciaria a confirmação de quem acabou
de cancelar — e exigiria um build novo do aplicativo para a repor.

**`app/admin/appointments/page.tsx`**

- Caixa nova no diálogo de edição: *"Tell the patient about this change"*.
- Ela **marca-se sozinha** quando data, hora ou formato mudaram — o que o
  paciente precisa de saber — e **para de se mexer** assim que alguém a clica.
  Uma caixa que volta a marcar-se depois de desmarcada é uma caixa que ninguém
  controla.
- Preço, duração e nota **não** a marcam.
- Fechar o diálogo zera a caixa: cada edição decide de novo.
- O toast passou a dizer o que aconteceu — *"The patient has been told about the
  change"* ou *"Nothing was sent to the patient"*. Foi não saber que fez o
  paciente receber a confirmação errada.
- `updateStatus` manda `notifyPatient: newStatus === "CANCELLED"`. Cancelar é a
  única das três que o paciente precisa de saber, e clicar em *Cancel it* já é o
  pedido — não precisa de segunda caixa.

## Critérios de aceite

- [x] Salvar sem pedir não manda e-mail nem push
- [x] Pedir explicitamente manda os dois
- [x] `"true"` vale; `false`, `"false"`, `null`, `0` e `"sim"` não
- [x] `COMPLETED` e `NO_SHOW` em silêncio
- [x] Cancelamento sai pelo modelo de cancelamento, não pelo de confirmação
- [x] Paciente que cancela a própria consulta continua recebendo o recibo
- [x] O telefone dele não toca com o que ele mesmo fez

## Provas

`__tests__/agenda/a-edicao-so-avisa-se-pedirem.test.ts` — 13 cenários.

**Testados por mutação:** revertido o código ao comportamento antigo, **8 dos 13
falham**. Os testes medem a correção, e não a grafia dela.

Suíte completa depois: **2799 testes, 187 suítes, tudo verde.** `npx tsc
--noEmit` em 0 erros na web e no mobile.

## O que fica em aberto, e não foi feito aqui

- **Não existe template `APPOINTMENT_UPDATED`.** Uma edição avisada reusa o de
  confirmação, então o texto continua a dizer *"has been successfully booked"*
  mesmo quando o que houve foi uma remarcação. Quem marcar a caixa vai mandar
  uma frase errada — de propósito, agora, mas errada.
- ~~O domicílio nesta rota é farejado por regex nas notas~~ — **corrigido na
  T-9**, junto com a extração do helper. Uma visita domiciliar com as notas
  vazias recebia o endereço da clínica.

O primeiro fica registado para a próxima leva.
