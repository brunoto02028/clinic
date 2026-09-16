# QA Report — T-3: UI — form de item completo + "Add item" escondido

**Data:** 2026-09-16 (2 rodadas)
**Resultado geral:** ✅ aprovado — a 1ª rodada achou 2 bugs, corrigidos no commit 44a446d e
reverificados
**Ambiente:** Produção, paciente de teste `QA44 A…`, sessão SUPERADMIN, cache limpo via CDP.

## 1ª rodada — bugs achados
1. **"Add to this week" criava o item mas o editor não abria.** Causa: `fetchData` da ficha
   mostrava o spinner de página inteira a cada recarregamento, desmontando a aba e perdendo o
   estado do componente. Corrigido: spinner só no primeiro carregamento do paciente.
2. **Mover um item visível pra uma semana futura deixava ele visível** — a paciente passou a ver
   a seção "Weeks 5-6" só por causa desse item (confirmado impersonando). Corrigido: item movido
   herda a visibilidade do destino (visível só se a semana de destino já está toda liberada).

## Resumo (após correções)
| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | End week (3) menor que start week (5) → "End week must be empty or not before the start week.", nenhum PATCH enviado | ✅ |
| 2 | Start 5 / end 6 → item aparece no grupo "Weeks 5-6" | ✅ |
| 3 | Buscar "knee 005", selecionar → mostra "has video" + "Open in library" + "Unlink"; salvar → ícone de vídeo verde no item | ✅ |
| 4 | Paciente (impersonada) vê "Watch video" nesse item no card Today | ✅ |
| 5 | "Unlink" + salvar → item sem exercício | ✅ |
| 6 | "Open in library" aponta pra `/admin/exercises?search=knee%20005`; a biblioteca abre com a busca preenchida e o exercício listado | ✅ |
| 7 | "Add to this week" em Weeks 3-4 (escondida) → editor abre com semana 3–4 e aviso "Hidden from the patient until you release it…" | ✅ |
| 8 | Ligar exercício num item "New item" → título vira o nome do exercício | ✅ |
| 9 | Salvar → grupo continua "Hidden"; paciente não recebe item novo | ✅ |
| 10 | Mover "Precautions & Swelling Control" de 5-6 (escondida) de volta pra 1-2 (liberada) → enviado `hiddenFromPatient: false`, fica visível | ✅ |
| 11 | Mover "Straight-Leg Raise" de 1-2 pra 7-9 (escondida) → enviado `hiddenFromPatient: true`; paciente continua vendo só `1-1, 1-2` | ✅ |
| 12 | Duplicar item visível → cópia na mesma semana, escondida, grupo vira "Partly visible" | ✅ |
| 13 | Apagar (com confirmação) → item some | ✅ |
| 14 | Sem erro de JS no console | ✅ |

## Evidências
- `screenshots/t3-validacao-semana.png` — erro de semana no form.
- `screenshots/t3-exercicio-ligado.png` — exercício ligado no editor.
- `screenshots/t3-paciente-watch-video.png` — "Watch video" na tela da paciente.
- Resultados de API/DOM de cada cenário registrados na sessão (valores enviados no PATCH lidos da
  própria requisição).

## Reverificação após o code review (build 12:02, 16/09)
- Fases oferecidas no editor: só `SHORT_TERM`, `MEDIUM_TERM`, `LONG_TERM` ✅
- `itemUpdate: "x"` → 400 (antes 500) ✅
