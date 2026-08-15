# QA — T-3: Parar a criação de triagem por efeito colateral

**Data:** 15/08/2026
**Ambiente:** produção (`bpr.clinic`)
**Build:** deploy do PR #80
**Veredito:** aprovado

Dois pacientes descartáveis — um sem triagem, um com — removidos ao final.

---

## Resultados

| # | Cenário | Resultado |
|---|---|---|
| 3.1 | Paciente sem triagem registra nota de dor | **passou** — nenhuma triagem criada |
| 3.2 | A nota de dor continua sendo guardada | **passou** — gravada e lida de volta |
| 3.3 | Ficha do paciente depois disso | **passou** — segue "Not filled" |
| 3.4 | Paciente com triagem registra dor | **passou** — triagem intacta, medidas acumulam |

## Evidências

**3.1 e 3.3 — o bug que motivou a tarefa**

```
paciente SEM triagem, apos registrar dor:
  triagem criada?  NAO — correto
  medidas gravadas: 1
  a ficha diria:   Not filled
```

Antes desta mudança, esse mesmo registro criaria um prontuário de triagem que
ninguém preencheu — e que, pelo bug da T-2, apareceria como concluído.

**3.2 — o dado não se perdeu**

```json
{ "vasScore": 6, "faamAdl": 40, "faamSport": 20,
  "faamAdlPercent": 49.4, "faamSportPercent": 25,
  "overallFunction": 55, "recordedAt": "2026-08-15T12:05:40.646Z" }
```

Gravado na tabela nova e devolvido pela leitura.

**3.4 — triagem intacta e histórico preservado**

```
triagem apos 2 registros de dor:
  {"painScore":7,"isSubmitted":true,"filledBy":"PATIENT","redFlagDetails":null}
  painScore continua 7?  SIM — intacta

medidas acumuladas: 8 -> 3  (2 registros)
```

Confirma também a correção do segundo bug: as medidas eram **sobrescritas** a
cada registro. Agora acumulam, e a leitura devolve a mais recente (3), que é o
que a evolução do paciente exige.

O passo "Pain & Function Measures" do progresso passou a `completed`, lendo da
tabela nova.

## Limpeza

```
contas de teste: 0
usuarios reais: 8
triagens: 3          (voltou ao número original)
medidas de desfecho: 0
```
