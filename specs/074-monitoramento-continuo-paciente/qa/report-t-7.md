# QA Report — T-7: Exportação do relatório em PDF

**Data:** 23/09/2026
**Ambiente:** worktree `C:\Users\bruno\orca\workspaces\clinic\app_clinic`, servidor `http://localhost:4010`
(PID 27364, confirmado deste worktree). Banco `bpr_clinic_local`. Mesmo paciente de teste de T-6:
`qa-t6-patient@example.com` · `cmueoio020009xznwrt4zz1pj`, na clínica `qa-report-t6`.
**Resultado geral:** ⚠️ **aprovado com ressalvas** — 2 falhas (1 herdada de T-6, 1 própria do PDF) e 1 defeito cosmético.

> **Correções aplicadas depois deste QA:**
> - **Cenário 13** — `safeText` deixou de trocar por `?` tudo que está fora de Latin-1. Agora translitera
>   o que um terapeuta digita ou cola. Prova:
>   ```
>   antes:  Load ≥ 20 kg → tolerated — patient's words: "much better"… •
>   depois: Load >= 20 kg -> tolerated - patient's words: "much better"... -
>   acentos PT preservados: Pressão arterial - avaliação
>   ```
> - **Cenário 14** — corrigido na raiz, em `lib/patient-report.ts` (ver `report-t-6.md`).
> - **Cenário 15** — a tabela de wearable ganhou rótulos ("Measure/Value", "Medida/Valor").
> - **Nit 4** — o gráfico do PDF passou a desenhar a linha de pulso, com falha tratada como falha (uma
>   leitura sem FC vira lacuna, não uma linha atravessando o nada).
>
> **Falta reteste.**

## Resumo

| # | Cenário (qa-spec / pedido) | Tipo | Resultado |
|---|---|---|---|
| 1 | 7.1 — baixar o PDF pela tela; headers corretos | UI+API | ✅ |
| 2 | 7.4 — nome do arquivo identifica paciente e período | API | ✅ |
| 3 | 7.2 — conteúdo seção a seção idêntico à tela, no mesmo período | API | ✅ |
| 4 | 7.3 — cabeçalho: clínica, paciente, período, data de geração | UI | ✅ |
| 5 | 7.3 — logo da clínica quando carrega | UI | ✅ |
| 6 | 7.3 — logo ausente / 404 / inalcançável / tipo errado: PDF sai assim mesmo | API | ✅ |
| 7 | pt-BR: acentos corretos, sem `?` no lugar de letra | API | ✅ |
| 8 | Inglês e português sem string no idioma errado | API | ✅ |
| 9 | Muito dado: quebra de página, cabeçalho repetido, rodapé + numeração | UI | ✅ |
| 10 | Paciente sem nenhum dado: PDF de 1 página dizendo isso | API | ✅ |
| 11 | 7.5 — **nada foi enviado** | API+DB | ✅ |
| 12 | Staff de outra clínica na rota do PDF | API | ✅ |
| 13 | **Texto clínico fora de Latin-1 virava `?`** | API | ❌ → corrigido |
| 14 | **O PDF herdava o corte do dia de hoje** | API | ❌ → corrigido |
| 15 | Tabela "Wearable data" com cabeçalho vazio | UI | ⚠️ → corrigido |

**Artefatos:** `qa/artefatos/t-7-report-qa-testpatient-en.pdf`, `…-pt.pdf`, `…-sem-logo-en.pdf`,
`…-paciente-sem-dado.pdf`, mais o texto extraído em `t-7-texto-extraido-{en,pt}.txt`.

## Detalhes

### 1. Baixar o PDF pela tela ✅

```
PDF URL requested by the button:
  /api/admin/patients/<id>/report/pdf?from=2026-06-25&to=2026-09-23&lang=en-GB
PDF RESPONSE 200 | content-type: application/pdf
  | content-disposition: attachment; filename="report-qa-testpatient-2026-06-25-to-2026-09-23.pdf"
cache-control: no-store
```

Assinatura `%PDF-1.3`, producer `jsPDF 4.2.1` — a mesma lib das faturas, nenhuma dependência nova. Em
pt-BR o botão manda `&lang=pt-BR`, e `from`/`to` são os do período que a tela está mostrando.

### 2. Nome do arquivo ✅

`report-qa-testpatient-2026-06-25-to-2026-09-23.pdf` — paciente + início + fim, ASCII, acentos
normalizados. Paciente vazio: `report-qa-emptypatient-…`. Janela de agosto: `…2026-08-01-to-2026-08-31`.

### 3. Conteúdo seção a seção ✅

Comparação entre tela, JSON da API e texto extraído do PDF, na janela de agosto:

| Seção | Tela | JSON | PDF |
|---|---|---|---|
| Período | 01/08 — 31/08 | `days 30` | `Period: 01 Aug 2026 - 31 Aug 2026 (30 days)` |
| Dias com exercício | 16 (de 30) | `16 / 30` | `16Days with exercise logged (of 30 days)` |
| Check-ins | 31 | 31 | `31Check-ins` |
| Leituras de PA | 20 (4 ≥ 130/80) | 20 / 4 | `20Blood pressure readings (4 at or above 130/80)` |
| Consultas · Notas · Wearable | 1 · 1 · 15 | idem | idem |
| Aderência semanal | barras | 21 logs | `Week of / 27 Jul 2026 1 / 03 Aug 2026 5 …` |
| Triagem | dor 6/10, 2 red flags | idem | `Pain score: 6/10` · `Red flags: Night pain, Dizziness / balance` |
| Wearable | 128.090 passos, 7.0 h, 57 bpm, 54 ms, 96% | idem | idem |

Estrutural, não coincidência: tela e PDF chamam `buildPatientReport`, a mesma leitura.

### 4. Cabeçalho ✅

```
QA Report Clinic T6
PATIENT REPORT
Generated: 23 Sept 2026
Qa TestPatient
qa-t6-patient@example.com  ·  Date of birth: 12 Apr 1985
Period: 25 Jun 2026 - 23 Sept 2026 (90 days)
```

**Evidência:** `screenshots/t-7-pdf-en-p1.png`

### 5–6. Logo ✅

Com logo PNG válido, aparece à esquerda do nome da clínica e o arquivo cresce de 213.444 → 239.110 bytes.
Os quatro modos de falha dão exatamente o tamanho do caso sem logo — o logo é omitido e o relatório sai:

```
logoUrl = null                       -> 200  213444  pdf válido
logoUrl = 404                        -> 200  213444  pdf válido
logoUrl = host inalcançável          -> 200  213444  pdf válido
logoUrl = text/html                  -> 200  213444  pdf válido
logoUrl = PNG válido                 -> 200  239110  pdf válido
```

**Evidência:** `screenshots/t-7-pdf-sem-logo-p1.png`

> **Atenção de configuração (não é bug):** `logoDataUri()` resolve `logoUrl` relativo contra
> `NEXTAUTH_URL`, que neste worktree aponta para `:3000` e não para o dev em `:4010`. Em produção
> (`https://bpr.clinic`) resolve certo.

### 7–8. Idioma ✅

Zero `?` no PDF em português. Amostra: `RELATÓRIO DO PACIENTE`, `Período`, `Pressão arterial`,
`Sinais de alerta: Dor noturna, Tontura / equilíbrio`, `Sono médio`, `Página 6/6`. Varredura de 27 termos
ingleses no PDF pt: só conteúdo gravado (`Physiotherapy`, `COMPLETED`, texto das notas). Varredura de
termos portugueses no PDF en: zero.

**Evidência:** `screenshots/t-7-pdf-pt-p1.png`, `screenshots/t-7-pdf-pt-p6.png`

### 9. Paginação ✅

```
rodapé  : 6 ocorrências (uma por página)   numeração: Page 1/6 … 6/6
"DateReadingPulseMethod"     : 2  (repetido na quebra)
"DatePainMoodEnergySleep"    : 3
"Week ofItems completed"     : 2
```

**Evidência:** `screenshots/t-7-pdf-en-p2.png`, `screenshots/t-7-pdf-en-p6.png`

### 10. Paciente sem dado ✅

1 página: cabeçalho completo, "Nothing was recorded for this patient in this period.", rodapé e
numeração. Nenhuma tabela ou gráfico vazio.

### 11. Nada foi enviado ✅

```
===== ANTES =====                       ===== DEPOIS (3 downloads) =====
outboundMessagesForPatient: 0           outboundMessagesForPatient: 0
outboundMessagesForClinic:  0           outboundMessagesForClinic:  0
auditLogRowsForPatient:     1           auditLogRowsForPatient:     1
journeyNotifications:       0           journeyNotifications:       0
alertsInClinic:             0           alertsInClinic:             0
```

A única linha de `AuditLog` é o `LOGIN_SUCCESS` da sessão aberta pelo próprio QA, anterior aos downloads.
Confirmação estática: `grep -niE "sendEmail|resend|nodemailer|outboundMessage|sendPush|mail\("` nos quatro
arquivos do caminho → **nenhuma ocorrência**.

### 12. Tenant ✅

```
admin da clínica B  → 404 {"error":"Patient not found"}
o próprio paciente  → 403 {"error":"Forbidden"}
id inexistente      → 404
```

Nenhum byte de PDF, nenhum campo do paciente no corpo.

### 13. ❌→corrigido — `?` em texto clínico

```
### o que a API (e a tela) tem
UNICODE-PROBE: em dash — curly quotes "" '' arrow → ge ≥ bullet • ellipsis …
Range of motion improved — patient's words: "much better". Load ≥ 20 kg → tolerated.

### o que o PDF imprimia
A: UNICODE-PROBE: em dash ? curly quotes ?? ?? arrow ? ge ? bullet ? ellipsis ?
P: Continue ? review in 2 weeks.
```

`≥ 20 kg` virando `? 20 kg` muda o que está escrito num documento que vai ao prontuário.
**Correção:** tabela de transliteração em `lib/patient-report-pdf.ts`; `?` fica só para o que não tem
equivalente. Acentos portugueses já estavam corretos (são Latin-1).

### 14. ❌→corrigido — o PDF não mostrava o dia de hoje

Mesma causa e mesma correção de T-6 (`lib/patient-report.ts`), porque tela e PDF compartilham a função.

### 15. ⚠️→corrigido — cabeçalho vazio na tabela de wearable

`table(["", ""], …)` pintava a barra verde sem rótulo. Agora "Measure/Value" e "Medida/Valor".

## Falhas e recomendações

1. **(corrigida)** `?` no lugar de travessão, aspas curvas, ≥, →, •, ….
2. **(corrigida, herdada)** O PDF não mostrava o que foi registrado hoje.
3. **(corrigido)** Cabeçalho vazio na tabela de wearable.
4. **(corrigido)** O gráfico do PDF não trazia a linha de pulso.
5. **(config, não código)** `NEXTAUTH_URL` em dev aponta para `:3000`, então `logoUrl` relativo não
   carrega no ambiente local.

## Fora do escopo desta passagem

- Regressão de fim de atividade (`npm run build`, 21 telas, `tsc` do mobile, diff de schema).
- QA em produção — depois do deploy.
- Abertura em leitores de terceiros (Acrobat, Preview): validada a estrutura (`%PDF-1.3`, 6 páginas,
  `pdf-parse` e PyMuPDF renderizam todas), não aberto num leitor de desktop.
