# QA Report — T-15: "Medir pressão", caixa de entrada e origem no histórico

**Data:** 24/09/2026 · mesmo ambiente do `report-t-14.md`
**Resultado geral:** ⚠️ **aprovado com ressalvas** — 2 achados, **os dois corrigidos depois deste QA**

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 13 | Clínica sem aparelho: o botão não aparece | UI | ✅ |
| 14 | Com aparelho: botão, contexto, contagem regressiva, nome do aparelho | UI | ✅ |
| 15 | A leitura aparece sozinha ≤ 6 s + "Salvo no histórico de \<paciente\>" | UI | ✅ (~3 s) |
| 16 | Expirou: "Nenhuma medição chegou" + caixa de entrada | UI | ✅ |
| 17 | O polling para ao sair da tela | rede | ✅ |
| 18 | Caixa de entrada: lista, atribui, descarta com motivo, auditoria | UI+DB | ✅ |
| 19 | Atribuir a mesma leitura duas vezes → 409 | API | ✅ |
| 20 | Badge no menu soma as não atribuídas | UI | ✅ |
| 21 | Origem no histórico: admin ✅, dashboard ✅ (EN+PT), app ⚠️ por código | UI | ⚠️ parcial |
| 22 | Staff de outra clínica e paciente sem acesso | API | ✅ |
| 23 | Console sem erro nas telas novas | UI | ✅ |
| — | **A aba "Medições" perdia a seção ao ser clicada** | UI | ❌ → corrigido |

## Evidências decisivas

**13 —** clínica sem conexão `isClinicDevice`: `hasMeasureBtn: false`. O componente pergunta à API e
não desenha nada sem aparelho (`screenshots/t-15-13-sem-aparelho-sem-botao.png`).

**14 —** EN: "Measure blood pressure" → "When is this reading from? / Before the session / After the
session / Other" (um clique, sem formulário). Ao abrir:

```
Waiting for QaT14 PacienteUm's reading…
2:54
on BPM Connect — recepção
Cancel
```

PT: "Medir pressão" → "De quando é esta medida? / Antes da sessão / …".

**15 —** leitura injetada às `04:00:41`, exibida às `04:00:44` (~3 s, polling de 3 s):

```
127/81 mmHg · 72 bpm
Saved to QaT14 PacienteUm's record
```

A aba de pressão atualizou sem recarregar — o `onReading` dispara o `fetchData` da ficha.

**16 —** janela vencida, em um ciclo de polling: "No reading arrived / If you did measure, it is in
the inbox." com [Open the inbox] e [Open again].

**17 —** `GET /api/admin/measurement-sessions/<id>` a cada ~3 s (requisições #46 → #62 em ~40 s);
ao navegar para fora, **contagem congelada em #62** e 12 s sem nenhuma chamada nova (seriam ~4).

**18 —** atribuir 122/79 a PacienteDois com contexto "Antes da sessão": some da lista (5 → 4) e grava

```json
{"source":"CLINIC_DEVICE","method":"CLINIC_DEVICE","context":"PRE_SESSION",
 "recordedById":"<staffA>","notes":"Withings (clinic device, assigned manually)"}
```

Descartar sem motivo: botão desabilitado na UI e `400 {"error":"A short reason is required",
"errorPt":"É preciso dizer o motivo, em poucas palavras"}` pela API (idem com 2 caracteres).
Com motivo: some da lista, linha marcada com `discardedById`/`discardedAt`/`discardReason`, e
**nenhuma** `BloodPressureReading` com aquele `grpid` (`leaked: []`).
Auditoria: `CLINIC_MEASUREMENT_ASSIGN` (`automatic: false`) e `CLINIC_MEASUREMENT_DISCARD` (com
`reason`).

**19 —** 1ª atribuição `200`; 2ª `409 {"error":"This measurement has already been handled"}`.

**20 —** `/api/admin/pending-count` → `{"pendingPatients":0,…,"unassignedMeasurements":5}`; badge
vermelho **5** em "Patients".
*Nota de desenho:* o badge soma paciente pendente e medição sem dono no mesmo número.

**21 —** admin EN: coluna "Origin" → `Clinic device` + `before the session`; PT: "Origem" →
`Aparelho da clínica` + `antes da sessão`. Dashboard do paciente EN: `At the clinic` + `before`;
PT: `Na clínica` + `antes`. **App mobile: não executado** (sem emulador) — verificado por código e
pelo payload, que vem do mesmo endpoint validado.

**22 —** staff da clínica B: lista `{"measurements":[],"count":0}`, atribuir/descartar → `404`.
Paciente: `403` em tudo, inclusive `GET /api/admin/measurement-sessions` e o cancelamento.

**23 —** 0 erros e 0 avisos nas telas novas, com os chunks recarregados à força. *Na primeira
passada apareceram 9 erros de hidratação — falso negativo do chunk `immutable` em cache, o bug já
conhecido deste projeto; sumiram com refetch `cache: 'reload'`.*

## Achados ❌ → corrigidos

**A aba "Medições" caía na seção Agenda ao ser clicada.** `lib/admin-sections.ts` adicionava a aba à
seção Patients, mas `/admin/measurements/inbox` não estava no `matchRoutes` dessa seção: ao clicar,
o título virava "Agenda", a barra de abas trocava e a própria aba desaparecia
(`screenshots/t-15-bug-aba-medicoes-cai-em-agenda-pt.png`). **Corrigido:** `/admin/measurements`
entrou no `matchRoutes`.

**Origem "Digitada" para o aparelho do próprio paciente** — herdado do cenário 11 da T-14.
**Corrigido** em `lib/withings-ingest.ts` (`source: "PATIENT_DEVICE"`).

## O que mudou depois deste QA

- A caixa de entrada ganhou o cartão que **conecta o aparelho da clínica** (o OAuth com escopo
  `clinic` assinado no state) — antes não havia tela para isso e o QA teve de criar a conexão
  direto no banco.
- As guardas de tenant das rotas de medição deixaram de ser fail-open quando o tenant do staff não
  resolve.
- Atribuir pela caixa de entrada agora dispara o mesmo alerta clínico de qualquer outra leitura.

## Não coberto

- OAuth real do aparelho da clínica (exige credenciais e URL pública HTTPS).
- A tela do app mobile (sem emulador nesta sessão) — verificada por código e payload.
