# QA Report — T-5: Admin — histórico diário das prescrições soltas

**Data:** 2026-09-16
**Resultado geral:** ✅ aprovado
**Ambiente:** Produção (https://bpr.clinic), build 2026-09-16T06:50:33.678Z

## Resumo
| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Aba Exercises da ficha do paciente mostra as datas marcadas por prescrição | ✅ |
| 2 | Prescrição sem log nenhum não quebra o layout | ✅ |

## Evidência
Paciente de teste `QA43 SoltaB` (10 prescrições, uma delas — "knee 008" — marcada como feita em
14/09 via a tela do paciente, ver report-t-3.md).

- Admin → Ficha da paciente → aba Exercises → card de "knee 008": texto do rodapé leu
  `"Prescribed by Bruno · ✓ 14/09"` — data batendo exatamente com o que foi marcado.
- Card de "knee 009" (sem nenhum log): texto do rodapé leu só `"Prescribed by Bruno"`, sem
  "undefined", sem erro, sem quebra de layout.
