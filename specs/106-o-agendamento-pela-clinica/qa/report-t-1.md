# QA — 106 T-1: o texto que mente sobre o próprio sistema

**Data:** 29/09/2026
**Onde:** local, `npx next dev -p 4010`, worktree
`C:\Users\bruno\orca\workspaces\clinic\app_clinic`, banco local.
**Resultado geral:** ✅ **aprovado** — 5 cenários da spec + 6 sondagens de API,
sem reprovação.

## Onde eu medi, e como sei que é aqui

A porta 4000 serve outro checkout e não tem estas mudanças. Confirmei na
primeira navegação, dentro do navegador:

```
location.port = "4010"
texto do diálogo = "Schedule an appointment for a patient.
                    Nothing is sent to them until you decide."
```

A frase nova só existe neste worktree. O processo que escuta a 4010 é
`node …/app_clinic/node_modules/next/dist/bin/next dev -p 4010`.

**Paciente:** `Qa106 PacienteTeste` (`qa106.paciente@example.com`), criado para
este QA na clínica de teste `QA106 Clinica de Teste`. Nenhum paciente real foi
tocado.
**Tokens/segredos:** nenhum neste relatório.

## Onde fica o destino, em dev

Fora de produção o `outbound-guard` derruba todo envio e registra
`[OUTBOUND-SINK] email → <destino>: <assunto>` no log do servidor. O banco
**não** serve de destino aqui: `sendTemplatedEmail` não grava `EmailMessage`
quando o guarda derruba (*"was dropped by the outbound guard — not filed as
sent"*), então enviado e não-enviado produzem zero linhas iguais na tabela.

Por isso subi a 4010 de novo com o stdout num arquivo, e **provei primeiro que
o log fala** (1.3) antes de tratar o silêncio como prova (1.2). Um log mudo e
um envio bloqueado são indistinguíveis sem esse par.

## Resumo

| # | cenário | tipo | resultado |
|---|---|---|---|
| 1.1 | nenhuma frase do diálogo diz "automaticamente" | UI | ✅ |
| 1.2 | criar **sem** marcar a caixa → nenhum e-mail sai | UI + log | ✅ |
| 1.3 | criar **marcando** a caixa → o e-mail sai | UI + log | ✅ |
| 1.4 | caminho visível para escrever a confirmação | UI | ✅ |
| 1.5 | as duas línguas dizem a mesma coisa | UI | ✅ |
| A–E | `POST` sem o campo / `false` / `null` / `1` / `"yes"` | API | ✅ nada sai |
| F | `POST` com `sendConfirmation: true` | API | ✅ sai |

---

## 1.1 e 1.5 — o texto, nas duas línguas ✅

`innerText` inteiro do diálogo, lido do DOM, com
`/automat/i.test(texto) === false` nas duas.

**Inglês** 📷 `screenshots/t-1-dialogo-en.png`

```
Schedule an appointment for a patient. Nothing is sent to them until you decide.
…
Send the confirmation email now, without a preview
Unchecked — the default — the appointment is created and nothing goes out.
You write it and see the preview afterwards, under "Email confirmation".
```

**Português** 📷 `screenshots/t-1-dialogo-pt.png`

```
Agende uma consulta para um paciente. Nada é enviado a ele até você decidir.
…
Enviar o e-mail de confirmação agora, sem prévia
Desmarcado — o padrão — a consulta é criada e nada sai. Você escreve e vê a
prévia depois, em "Confirmar por email".
```

As duas dizem a mesma coisa, e nenhuma promete envio automático. Varri o
diálogo inteiro — tipo de tratamento, formato, pagamento, cortesia, isenção,
notas de IA — e não sobrou nenhuma outra frase sobre envio.

Estado inicial das caixas, lido do DOM:

| caixa | marcada |
|---|---|
| Enviar o e-mail de confirmação agora, sem prévia | **false** |
| Sessão de cortesia | false |
| Isentar a cobrança | false |

---

## 1.3 — com a caixa marcada, o log fala ✅

*Medido primeiro, de propósito: é o controle que dá sentido ao 1.2.*

Consulta criada pelo diálogo, `Qa106 PacienteTeste`, 08/10/2026 14:00, caixa
**marcada** (`checked === true` confirmado no DOM antes de submeter).

```
[OUTBOUND-SINK] email → qa106.paciente@example.com, qa106.admin@example.com:
                Appointment Confirmed ✅ — Thursday, 8 October 2026
[email-templates] "APPOINTMENT_CONFIRMATION" to qa106.paciente@example.com
                was dropped by the outbound guard — not filed as sent
[OUTBOUND-SINK] email → qa106.paciente@example.com:
                ⚠️ Action Required: Complete your medical screening before your appointment
[OUTBOUND-SINK] email → qa106.admin@example.com:
                📅 Appointment Created: Qa106 PacienteTeste — Consultation
 POST /api/admin/appointments 200 in 344ms
```

**HTTP 200.** Três linhas com o endereço do paciente. O log fala.

---

## 1.2 — sem marcar a caixa, nada sai ✅

*O cenário que importa.*

Mesma tela, mesmo paciente, 08/10/2026 16:00, caixa **desmarcada**
(`checked === false` confirmado no DOM antes de submeter). Log inteiro da
janela da requisição, sem recorte:

```
 GET /api/version 200 in 202ms
 GET /api/admin/notifications 200 in 230ms
 GET /api/admin/pending-count 200 in 232ms
 GET /api/admin/pending-count 200 in 100ms
[OUTBOUND-SINK] email → qa106.admin@example.com:
                📅 Appointment Created: Qa106 PacienteTeste — Consultation
 POST /api/admin/appointments 200 in 121ms
 GET /api/admin/appointments 200 in 110ms
 GET /api/admin/pending-count 200 in 103ms
```

**HTTP 200.** **Zero linhas com `qa106.paciente@example.com`.**

O que torna esse zero uma prova e não um silêncio: a linha do aviso ao admin
(`📅 Appointment Created`) saiu **nesta mesma requisição**. Ela não é opcional —
a rota a envia sempre. Então o caminho de e-mail estava vivo, o log estava
escrevendo, e mesmo assim nada foi endereçado ao paciente.

A tela concorda com o destino 📷 `screenshots/t-1-sem-caixa-toast.png`:

> **Appointment created**
> No email was sent. Use "Email confirmation" on the appointment to preview and send it.

E a caixa do paciente, vista pelo compositor, confirma pelo terceiro lado:
**"Emails sent — No emails sent from here yet."**

---

## 1.4 — o caminho para escrever a confirmação ✅

Toda consulta criada ganha um botão **"Email confirmation"** na própria linha,
que leva a `/admin/patients/<pacienteId>?email=<consultaId>`. O toast aponta
para ele pelo nome.

O destino é o compositor 📷 `screenshots/t-1-caminho-escrever-confirmacao.png`:

```
Email to patient
Write the email, then preview it. Nothing is sent until you confirm on the preview.

Start from: General Consultation — 08/10/2026, 14:00
Send in:    Both (patient's language first)

Subject (English):    Your appointment — Thursday, 8 October 2026, 14:00
Subject (Portuguese): Sua consulta — quinta-feira, 8 de outubro de 2026, 14:00
                                                                  [ Preview ]
```

Vem pré-preenchido com a consulta, nas duas línguas, e com a etapa de prévia
antes do envio — a regra da casa.

---

## O defeito novo: `POST` sem o campo `sendConfirmation`

Seis chamadas seguidas a `POST /api/admin/appointments`, mesma sessão, mesmo
paciente, variando só o campo. **Status HTTP medido, não esperado.**

| caso | corpo enviado | HTTP | linhas de e-mail ao paciente |
|---|---|---|---|
| A | `{}` — **campo ausente** | **200** | **0** |
| B | `{"sendConfirmation": false}` | **200** | **0** |
| C | `{"sendConfirmation": null}` | **200** | **0** |
| D | `{"sendConfirmation": 1}` | **200** | **0** |
| E | `{"sendConfirmation": "yes"}` | **200** | **0** |
| F | `{"sendConfirmation": true}` | **200** | **3** |

O log das seis, na ordem:

```
[OUTBOUND-SINK] email → qa106.admin@example.com: 📅 Appointment Created: …   (A)
 POST /api/admin/appointments 200 in 111ms
[OUTBOUND-SINK] email → qa106.admin@example.com: 📅 Appointment Created: …   (B)
 POST /api/admin/appointments 200 in 95ms
[OUTBOUND-SINK] email → qa106.admin@example.com: 📅 Appointment Created: …   (C)
 POST /api/admin/appointments 200 in 133ms
[OUTBOUND-SINK] email → qa106.admin@example.com: 📅 Appointment Created: …   (D)
 POST /api/admin/appointments 200 in 104ms
[OUTBOUND-SINK] email → qa106.admin@example.com: 📅 Appointment Created: …   (E)
 POST /api/admin/appointments 200 in 98ms
[OUTBOUND-SINK] email → qa106.paciente@example.com, qa106.admin@example.com:
                Appointment Confirmed ✅ — Thursday, 8 October 2026            (F)
[email-templates] "APPOINTMENT_CONFIRMATION" to qa106.paciente@example.com
                was dropped by the outbound guard — not filed as sent
[OUTBOUND-SINK] email → qa106.paciente@example.com:
                ⚠️ Action Required: Complete your medical screening…
[OUTBOUND-SINK] email → qa106.admin@example.com: 📅 Appointment Created: …
 POST /api/admin/appointments 200 in 146ms
```

Em cada uma das seis a linha do admin saiu — o log estava vivo nas seis. O
buraco está fechado: **campo ausente não manda e-mail**, e nem `null`, nem `1`,
nem `"yes"`. Com o `!== false` de antes, **A, C, D e E teriam enviado** — quatro
das seis formas de chamar a rota alcançariam o paciente sem ninguém ter pedido.

**Contagem da sessão inteira:** 8 consultas criadas, 2 pedidos explícitos de
envio, 6 linhas de log com o endereço do paciente (3 por envio × 2). Nenhuma
das outras 6 criações produziu uma única linha.

---

## Verificado por sabotagem, não só por passar

`npx jest __tests__/agenda/` → **17 suítes, 299 testes, tudo verde.**

Depois troquei `pediramEnviarAoPaciente` de volta para o `!== false` original:

```
Test Suites: 2 failed, 15 passed, 17 total
Tests:       8 failed, 291 passed, 299 total

  ● uma porta de pagamento de cada vez › o e-mail deixou de ser obrigatório,
    e volta a ter prévia
    expect(pediramEnviarAoPaciente(undefined)).toBe(false)
    Expected: false   Received: true
```

Arquivo restaurado de backup e conferido por hash
(`cf4ce1c6bba3d2be5981e6c75b1b89ec9c11fb28`, idêntico ao de antes); a suíte
voltou a 299/299. **A suíte falha se o buraco voltar.**

---

## Erros de console

Nenhum. Zero erros e zero warnings em toda a sessão. As únicas linhas são
Web Vitals e o convite do React DevTools.

---

## Achados fora do pedido

1. **`sendConfirmation: "true"` (string) envia.** `pediramEnviarAoPaciente`
   aceita `=== true || === "true"`. Não medi essa variante ponta a ponta, só li
   a função — fica como ⚠️ não executado. É deliberado (um formulário
   `multipart` manda strings) e não é defeito, mas vale saber que o "sim
   explícito" tem duas grafias.

2. **O aviso de triagem também é um e-mail ao paciente, e viaja junto.** Quando
   a caixa está marcada saem **dois** e-mails ao paciente: a confirmação e o
   "⚠️ Action Required: Complete your medical screening". O segundo não passa
   por prévia nenhuma — é `sendEmail` cru dentro da rota. Está corretamente sob
   a mesma trava (`if (emailPatientNow)`), então o 1.2 continua limpo; mas quem
   marca a caixa esperando "a confirmação" manda duas coisas, e só uma delas
   foi escrita por alguém.

3. **O aviso ao admin sai sempre**, inclusive quando nada vai ao paciente. Está
   certo — é o que tornou o 1.2 mensurável —, mas significa que "criar
   consulta" nunca é uma operação totalmente silenciosa.

4. **`NEXTAUTH_URL` aponta para `:3000`.** Ao sair da sessão na 4010 o navegador
   foi mandado para `http://localhost:3000/login`, que não existe. Ruído de
   ambiente local, fora do escopo da 106, mas atrapalha qualquer QA que precise
   trocar de usuário.

---

## Veredito

**Aprovado.** O texto parou de mentir nas duas línguas, o padrão continua não
enviar, o caminho para escrever depois existe e está rotulado, e o buraco de
servidor que apareceu atrás da frase está fechado — medido no destino, com o
controle que prova que o destino estava escutando.

**Falta medir em produção** depois do deploy, com o commit confirmado na lista
de deployments do Coolify.

---

## Fixtures deste QA

Clínica isolada `QA106 Clinica de Teste` (`qa106-clinica-de-teste`), com
`qa106.admin@example.com` (ADMIN) e `qa106.paciente@example.com` (PATIENT,
"Qa106 PacienteTeste"). Oito consultas em 08/10/2026 — duas pelo diálogo, seis
pelas sondagens de API. Nada fora dessa clínica foi tocado.
