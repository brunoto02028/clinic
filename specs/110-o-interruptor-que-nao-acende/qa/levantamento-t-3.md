# T-3 — Levantamento: o que o servidor já nega

**Data:** 30/09/2026 · leitura de código, sem tocar em nada

> ⚠️ **Este documento retrata o código de antes da T-2.** Ele diz, em vários
> lugares, que a nota clínica é guardada por `mod_records` — era verdade quando
> foi escrito e **deixou de ser**. Depois da divisão, a nota é `mod_clinical_notes`
> nos cinco lugares (API do app, `/api/soap-notes`, a nota por id, o PDF e a tela
> do app), e `mod_records` ficou com medidas de evolução e relatórios.
>
> Fica como estava de propósito: é o levantamento que **motivou** a mudança, e
> reescrevê-lo apagaria o raciocínio que levou até ela. O que está abaixo é o
> retrato do antes, com as correções marcadas onde eu errei.

## O resumo, que é melhor do que eu supus

Existe um portão de módulo **no servidor**: `patientGate({ module })` em
`lib/patient-gate.ts`, que responde **403 `module_not_in_plan`**.

```
rotas de paciente com patientGate : 75
  pedem módulo                    : 36
  não pedem                       : 39
```

As 39 sem módulo **não são 39 buracos**: a maioria não tem módulo para pedir —
conta, senha, consentimento, status de onboarding, faturas, pressão arterial.
Buraco é só onde o **menu esconde** e a **rota serve**.

## A correção do que eu disse ao Bruno

Eu afirmei que desligar *My Records* não esconde o prontuário, e deixei no ar que
era um vazamento. **Não é.**

`GET /api/patient/clinical-notes` pede `mod_records`. Desligado, responde 403 e
**não devolve nota nenhuma**. O que está quebrado é que o item **My records**
continua no menu do app — o paciente vê o botão, toca, e cai num erro.

Experiência quebrada, não vazamento. A porta está fechada; o que sobrou na
parede foi a maçaneta.

## O buraco de verdade, e é um só

| | |
|---|---|
| rota | `GET /api/patient/reports` |
| gate | `patientGate()` — **sem módulo** |
| item no menu | *My reports*, que carrega `mod_records` |

Desligar *My Records* **esconde o botão** dos relatórios e a rota **continua
servindo**. É exatamente o padrão que esta casa já escreveu: *esconder botão não
é fechar porta*. Quem souber o caminho, ou cuja chamada de permissões falhe —
o menu falha aberto —, recebe os relatórios.

## `mod_clinical_notes` não era morto — eu é que não olhei o lugar certo

**Correção, escrita depois de implementar a T-2.** Este levantamento dizia que
nenhum código o lia. Errado: o portão de **página da web** o lê, pelo mapa
`HREF_MODULE_MAP` — `/dashboard/clinical-notes` é o `href` dele no catálogo, e
`canAccessHref` resolve a chave por aí.

Então a web já tinha a divisão **na página**, e só a API é que continuava
amarrada em `mod_records`. O que eu chamei de "chave morta" era meia divisão
feita ao contrário do que eu supus — e a T-2, ao mover as APIs, **fechou** a
divisão em vez de inventá-la.

O que segue abaixo estava certo sobre rotas e sobre o menu do app, e errado sobre
"ninguém lê".

Nenhuma **rota de API** o pedia, e nenhum item do menu do app o lia. O código explica, no lugar
certo:

> *"Same gate the web uses for these same notes: `/api/soap-notes` checks
> `mod_records`. Gating on `mod_clinical_notes` here would let a patient whose
> clinic hid their records see them in the app and not on the web."*

A decisão está certa: **um critério só, lido pelos dois lados**. O que sobra é um
interruptor no painel que não é lido por ninguém — a mesma família dos quatro da
T-1, por outro motivo: lá falta a tela, aqui falta o leitor.

Ele aparece em `TREATMENT_MODULES` (um pacote de tratamento o concede), então
apagá-lo não é de graça.

## O que isto muda na T-2

A T-2 dizia ligar *My records* em `mod_clinical_notes`. **Estava errado.** Essa
chave não é lida por ninguém, e usá-la faria o menu e o servidor discordarem —
o menu esconderia por uma chave e o servidor negaria por outra.

A chave certa **parecia** ser `mod_records`, porque era a que a API usava.

**E também estava errado** — ver o aviso no topo. Olhando o portão de página da
web, `mod_clinical_notes` já governava `/dashboard/clinical-notes`. A resposta
certa não era alinhar tudo em `mod_records`: era **mover a API** para a chave que
a web já usava, e foi o que a T-2 fez, com o Bruno decidindo entre um interruptor
e dois.

## Os outros que passam no exame

| item do menu | módulo | rota | negado? |
|---|---|---|---|
| My records | (nenhum → `mod_records`) | `patient/clinical-notes` | ✅ |
| My documents | `mod_documents` | `patient/documents` | ✅ |
| Messages | `mod_messages` | `patient/messages` | ✅ |
| Outcome measures | `mod_records` | `patient/outcome-measures` | ✅ |
| Pending actions | `mod_tasks` | `patient/tasks` | ✅ |
| Daily check-in | `mod_journey` | `patient/daily-checkin` | ✅ |
| Articles | `mod_education` | `education` | ✅ |
| Devices | `mod_devices` | `wearables/*` | ✅ |
| Treatment plan | `mod_treatment` | `patient/protocol` | ✅ |
| **My reports** | `mod_records` | `patient/reports` | ❌ |

`Plans`, `Assessment screening` e `How it works` não entram: os módulos deles são
`alwaysVisible` — não há como desligá-los, então não há o que negar.

## Conclusão

**A T-3 não cresce.** Eu avisei que poderia virar atividade própria; não virou.
É uma rota, uma linha: `patientGate({ module: "mod_records" })` em
`patient/reports`.

Fica em aberto, para o Bruno: o que fazer com o interruptor
**Clinical Notes** do painel, que nenhum código lê.
