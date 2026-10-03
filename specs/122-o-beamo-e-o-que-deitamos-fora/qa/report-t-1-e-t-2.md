# QA — T-1 e T-2 (03/10/2026)

**Checkout:** `app_clinic` · branch `brunoto02028/app_clinic`
**Veredicto:** aprovado com ressalvas → **achados corrigidos no mesmo dia**, ver
`review-t-1-e-t-2.md` para a disposição de cada um.

Sem servidor e sem browser: os cenários de UI foram medidos no código. O 2.11
(produção, com o aparelho na mão) **não foi executado** — o BeamO só chega em
04/10.

## Cenários

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1.1 | Pessoal de conta partilhada, **dentro** de janela | Unit | aprovado |
| 1.2 | A mesma, **fora** de janela | Unit | aprovado |
| 1.3 | Aparelho de pulso (`93`/`94`) dentro de janela | Unit | aprovado |
| 1.4 | Modelo `null` dentro de janela | Unit | aprovado |
| 1.5 | Conta não partilhada | Unit | aprovado |
| 1.6 | `APARELHOS_DE_PULSO` só `[93, 94]` | Unit | aprovado |
| 2.1 | Clínica, ECG **dentro** de janela | Unit | aprovado |
| 2.2 | Clínica, ECG **sem** janela | Unit | aprovado |
| 2.3 | Clínica, **duas** janelas no mesmo instante | Unit | aprovado |
| 2.4 | Clínica, aparelho de pulso dentro de janela | Unit | aprovado |
| 2.5 | Ligação pessoal comum | Unit | aprovado |
| 2.6 | Auditoria `CLINIC_MEASUREMENT_ASSIGN` | Unit | aprovado |
| 2.7 | A régua nos dois lados | Unit | aprovado |
| 2.8 | `POST .../fetch` pede `bp`+`ecg` e devolve `ecg` | API | aprovado **depois** do A3 |
| 2.9 | "Já medi" com ECG e sem pressão | UI | aprovado **depois** do A3/G5 |
| 2.10 | A frase nas duas línguas, sem "diagnóstico" | UI | aprovado |
| 2.11 | Produção, ECG com o BeamO num paciente de teste | Prod | **não executado** — falta o aparelho |

Evidência final, depois das correções:

```
npx jest   → 272 suites, 3922 testes, 0 falhas
npx tsc --noEmit        → limpo
npm run typecheck:mobile → limpo
NEXT_DIST_DIR=.build-verify npx next build → ok
```

## Achados do QA

| # | Gravidade | O que é | Estado |
|---|---|---|---|
| A1 | **alta** | `.catch(() => [])` nas janelas: uma consulta que falha vira *"não há janela"* e escreve a medição do paciente no prontuário do dono, **sem log** | **corrigido** |
| A2 | média-alta | a regra do aparelho de pulso não se aplica aos vitais — `WithingsVital` não traz o aparelho | **documentado**, ver T-3 |
| A3 | média | o `ecg` da resposta contava as **guardadas**; nos casos em que a distinção importa dizia "nada veio" | **corrigido** |
| A4 | média | o log de `naoAtribuidos` vivia dentro do `try`, depois do laço: uma escrita que rebenta leva-o atrás | **corrigido** (`finally` + contadores em `IngestCounts`) |
| A5 | baixa-média | o motivo "de pulso" só era atribuído com janela a cobrir; o relógio fora de janela contava como "sem janela" | **corrigido** |
| A6 | baixa | um `return null` fora da contagem | **corrigido** |
| A7 | informativo | o `kinds` da rota não tem efeito para a ligação de clínica | aceite — `wanted` é quem manda, e está documentado |
| A8 | cobertura | 2.9 e 2.10 sem teste; 2.8 meio coberto | **corrigido** — asserções novas em `ja-medi-e-o-estado-visivel` |

## Nota de qualidade dos testes

Seis dos trinta liam o código como texto. Cinco tiram os comentários antes de
casar, que é a disciplina certa; o sexto lia o ficheiro cru e uma menção dentro
de um comentário satisfazia-o. Vale a releitura de `teste-que-le-codigo-como-texto`
sempre que se acrescentar um destes.
