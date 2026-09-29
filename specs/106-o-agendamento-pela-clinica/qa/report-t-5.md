# QA — 106 T-5: uma caixa marcada, dois e-mails

**Data:** 29/09/2026
**Onde:** local, `npx next dev -p 4030`, worktree
`C:\Users\bruno\orca\workspaces\clinic\app_clinic`, banco local.
**Resultado geral:** ✅ **aprovado** — os 3 cenários passaram, medidos no log do
servidor. Duas observações abaixo, nenhuma delas reprovando.

**Qual checkout serve a porta:** `:4030` → PID 27404, em
`...\app_clinic\node_modules\next\...\start-server.js`. A `:4000` é de
`C:\Users\bruno\Documents\clinic`, outro checkout, e não foi medida.

**Paciente:** `Qa106 PacienteTeste` (`qa106.paciente@example.com`), clínica
`QA106 Clinica de Teste`. Nenhum paciente real foi tocado.

## Como medi, e por que assim

Fora de produção, todo envio passa pelo `outbound-guard` e é **derrubado com
registro**: `[OUTBOUND-SINK] <canal> -> <destino>: <resumo>`. Nada saiu desta
máquina; o que saiu foi uma linha de log por envio tentado.

Isso resolve o e-mail. O **push** exigia uma fixture, e vale explicar por quê: se
o paciente não tem aparelho registrado, `sendPushToUsers` volta cedo, **sem
log** — e aí "não apareceu push no log" não prova nada, porque ele também não
apareceria se a chamada nunca tivesse acontecido. Então registrei um aparelho
para o paciente de teste:

```
PushDeviceToken: userId=<paciente de teste>, token=ExpoPushToken[qa106-fixture-token],
                 platform=ios, active=true
User.pushEnabled = true
```

Com aparelho e sem allowlist, a tentativa de push **fala no log** antes de ser
derrubada. É a mesma disciplina do 1.2 da T-1: primeiro provar que o log fala, e
só então tratar o silêncio como prova.

## Resumo

| # | cenário | resultado |
|---|---|---|
| 5.1 | criar **sem** marcar a caixa | ✅ nenhum e-mail e nenhum push ao paciente |
| 5.2 | criar **marcando** a caixa | ✅ 2 e-mails ao paciente **e** 1 push |
| 5.3 | o texto cita os três envios, nas duas línguas | ✅ |

---

## 5.1 — desmarcada, nada sai para o paciente ✅

Consulta criada pela tela: paciente de teste, sem tipo, 12/10 às 09:00, caixa
**desmarcada** (as três caixas do diálogo lidas como `[false, false, false]`
antes de clicar).

Log do servidor, todas as linhas entre o clique e a resposta:

```
 GET /api/admin/pending-count 200 in 78ms
[OUTBOUND-SINK] email -> qa106.admin@example.com: 📅 Appointment Created: Qa106 PacienteTeste — Consultation
 POST /api/admin/appointments 200 in 100ms
 GET /api/admin/appointments 200 in 71ms
```

| | |
|---|---|
| e-mails ao **paciente** | **0** |
| push | **0** |
| e-mail ao **admin da clínica** (aviso interno) | 1 |

O único envio é o aviso interno para a própria clínica — não sai para o
paciente, e é o que a casa já fazia antes.

📷 `screenshots/t-5-antes-de-criar-sem-caixa.png`

---

## 5.2 — marcada, saem os três ✅

Consulta criada pela tela: mesmo paciente, 12/10 às 10:00, caixa **marcada**
(lida como `[true, false, false]` antes de clicar).

Log do servidor, no mesmo recorte:

```
[OUTBOUND-SINK] email -> qa106.paciente@example.com, qa106.admin@example.com: Appointment Confirmed ✅ — Monday, 12 October 2026
[email-templates] "APPOINTMENT_CONFIRMATION" to qa106.paciente@example.com was dropped by the outbound guard — not filed as sent
[OUTBOUND-SINK] email -> qa106.paciente@example.com: ⚠️ Action Required: Complete your medical screening before your appointment
[OUTBOUND-SINK] email -> qa106.admin@example.com: 📅 Appointment Created: Qa106 PacienteTeste — Consultation
 POST /api/admin/appointments 200 in 179ms
[OUTBOUND-SINK] push -> cmummnahc0004xz0kkd41tg1c: Appointment booked
```

| envio | destino | linha |
|---|---|---|
| 1 — confirmação da consulta | paciente de teste | `Appointment Confirmed ✅ — Monday, 12 October 2026` |
| 2 — aviso de triagem médica | paciente de teste | `⚠️ Action Required: Complete your medical screening…` |
| 3 — **push** | id do paciente de teste | `push -> cmummnahc0004xz0kkd41tg1c: Appointment booked` |
| (interno) | admin da clínica | `📅 Appointment Created` |

O push é o que a T-5 acrescentou, e ele **só** aparece nesta combinação: a mesma
fixture de aparelho estava de pé no 5.1 e não produziu linha nenhuma. Os dois
envios são o mesmo pedido explícito — não há porta própria.

O destino do push é o **id do usuário**, não o token: quem lê o log não vê
aparelho de ninguém.

---

## 5.3 — o texto cita os três, nas duas línguas ✅

Lido do próprio rótulo da caixa, no diálogo.

**Inglês**

> **Notify the patient now, without a preview**
> Sends the confirmation email and the app notification — plus the medical
> screening reminder, if that is still missing. Unchecked, the default, the
> appointment is created and nothing goes out: you write it and see the preview
> afterwards, under "Email confirmation".

**Português**

> **Avisar o paciente agora, sem prévia**
> Manda o e-mail de confirmação e a notificação no aplicativo — e o aviso de
> triagem médica, se ela ainda faltar. Desmarcado, o padrão, a consulta é criada
> e nada sai: você escreve e vê a prévia depois, em "Confirmar por email".

Os três estão nas duas, na mesma ordem em que o log os mostra saindo:
confirmação, notificação do app, aviso de triagem. E as duas dizem que o padrão é
não enviar.

📷 `screenshots/t-5-caixa-en.png` · `screenshots/t-5-caixa-pt.png`

---

## Observações

### O1 — o aviso interno à clínica não é anunciado por ninguém ℹ️

**Medido nos dois cenários.** O e-mail `📅 Appointment Created: … ` para
`qa106.admin@example.com` sai **sempre**, marcada ou não a caixa. Ele não vai
para o paciente, então está fora da promessa que a caixa faz — a regra da casa é
sobre o que alcança paciente. Anotado porque, ao contar envios no log, ele é o
que sobra quando a resposta certa é "nenhum", e alguém pode confundir.

### O2 — o push vem depois do `await` do e-mail, dentro do mesmo `try` ℹ️

**Não medido — leitura de código, declarado como hipótese.**

Em `app/api/admin/appointments/route.ts`, `pushConsulta(...)` é chamado **depois**
de `await notifyPatient(...)`, dentro do mesmo bloco. Se `notifyPatient` lançar —
provedor fora do ar, modelo de e-mail ausente —, o `catch` registra a falha do
e-mail e o push **nunca é tentado**. O inverso está protegido: a falha do push é
capturada no `.catch()` dele e não derruba nada.

Não consegui reproduzir sem sabotar o provedor de e-mail, e não sabotei código de
produção. Fica como suspeita, não como falha. Se importar, o conserto é uma linha
de ordem: disparar o push antes do `await`, ou fora do `try` do e-mail.

### O3 — ruído de ambiente, não de código ℹ️

Duas linhas aparecem no log a cada criação:

```
[tenant] DEFAULT_CLINIC_SLUG="qa-075-default" does not match an active clinic
```

É o `.env` local apontando para uma clínica de QA antiga que já não existe. Em
produção a variável foi resolvida em 16/09. Ambiente, não código.

---

## Testes automatizados

`__tests__/agenda/liberar-manda-email-e-push.test.ts` — passa, junto com as outras
três suítes da atividade: **4 suítes, 46 testes, todos verdes**.

## Erros de console

Nenhum na tela servida por `:4030` — **0 erros e 0 avisos**.

---

## Veredito

**Aprovado.** Os três cenários passaram, e os dois primeiros foram medidos no
destino, não na interface: desmarcada, o log não tem **nenhuma** linha de e-mail
ou push endereçada ao paciente; marcada, tem exatamente três — confirmação,
aviso de triagem e o push novo. A prova de que o silêncio do 5.1 é silêncio, e
não cegueira do instrumento, é o 5.2 com a mesma fixture de aparelho de pé.

E a caixa passou a dizer o que faz, nas duas línguas. Era o achado original da
T-1: ela prometia um e-mail e mandava dois.

**Falta medir em produção** depois do deploy, com o commit confirmado na lista de
deployments do Coolify — em produção o push sai de verdade, e vale conferir com
um aparelho de teste, nunca com o de um paciente real.
