# QA T-21 — Montagem de treino pelo personal (web)

**Data:** 2026-09-10
**Ambiente:** local, http://localhost:4195 (banco `bpr_clinic_local`, `OUTBOUND_MODE=sink`). Produção não tocada.
**Atividade:** specs/20-multitenant-clinica-e-personal
**Resultado geral:** ✅ **APROVADO (5/5)** — após correção (1ª rodada reprovou: a aba estava no componente errado).

A aba "Workouts" foi ligada em `app/admin/patients/[id]/page.tsx` (a ficha real), gated por tenant personal (`isPersonal` via `useVocab`), renderizando `components/workouts/workout-builder.tsx`. Idioma UK: label "Workouts".

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Personal → ficha do aluno → aba "Workouts" aparece e abre | UI | ✅ PASS |
| 2 | New workout → add "QA Goblet Squat" → Sets 3 / Reps max 10 / Load 40 / RPE 8 → Save | UI+API | ✅ PASS (POST 201) |
| 3 | Reload → treino salvo na lista com contagem ≥1 (persistência) | UI+API | ✅ PASS (GET 200) |
| 4 | Progressão "+2.5 kg" (40 → 42.5) → Save | UI+API | ✅ PASS (PATCH 200) |
| 5 | Regressão: ficha do paciente da clínica NÃO tem aba "Workouts" | UI | ✅ PASS |

## Evidências
- `qa/screenshots/t-21-c1-aba-workouts-aberta.png`
- `qa/screenshots/t-21-c2-treino-preenchido.png`, `t-21-c2-salvo.png`
- `qa/screenshots/t-21-c3-persistido-apos-reload.png`
- `qa/screenshots/t-21-c4-progressao-42_5.png`
- `qa/screenshots/t-21-c5-clinica-sem-aba.png`

Confirmação via API (cenário 4): `GET /api/admin/workouts` → `Workout A`, 1 exercício, `QA Goblet Squat` com `sets:3, repsMax:10, loadKg:42.5, rpe:8`.

## Erros de console
Nenhum relevante no fluxo do builder. Ruídos observados são de sondagem de QA (`/api/*me`) e um `ERR_CONNECTION_REFUSED` de signout apontando para `localhost:3000` (NEXTAUTH_URL do ambiente) — sem impacto.

## Observações (fora do escopo da T-21 — sinalizado, não corrigido)
1. **Abas clínicas visíveis para tenant personal:** a ficha do aluno ainda mostra Protocolo/Notas Clínicas/Rehab Agent/Evidência para o personal. O gating dessas sub-abas por tipo de tenant é da trilha de nav/gating (T-19b estendida), não da T-21.
2. **Dev: chunks de rota com `Cache-Control: immutable`** — em dev o bundle muda on-demand, mas a header prende o browser ao antigo até bypass de cache (atrapalhou o 1º re-teste). Revisar essa header em dev (deveria ser `no-store`). Não é código da T-21.
3. **Busca da biblioteca dispara no submit** (Enter/lupa), não ao digitar — comportamento intencional do componente (evita marteladas na API).

## Respostas ao code review
O review confirmou o **gating correto** (aba só no personal; sem regressão na clínica) e **sem vazamento** (`studentId` do params é re-escopado pela API T-20 no servidor). 7 achados no builder (UX/robustez) — 6 corrigidos, 1 aceito:

| # | Achado | Disposição |
|---|--------|-----------|
| 1 | Closure de `selectedId` obsoleta em `load` re-selecionava o 1º treino a cada refetch | ✅ `load` não auto-seleciona mais; seleção só no mount e explícita pós-mutação. |
| 2 | `duplicate` mostrava cuid (POST omite `exercise` aninhado) | ✅ re-seleciona a partir da lista recarregada (GET traz `exercise`). Mesmo tratamento no `save`. |
| 4 | Key por índice quebrava foco na reordenação | ✅ `_uid` estável por linha. |
| 5 | `load` ligava o spinner de tela cheia a cada mutação (flicker) | ✅ spinner só no mount; refetch mantém o editor montado. |
| 3 | Inputs numéricos sem `min`/`step`; `progressLoad` sem clamp | ✅ `min`/`max`/`step` por campo (RPE 1–10, RIR 0–5, carga ≥0 step 0.5); `progressLoad` clampa em ≥0. |
| 7 | `+1 rep` só mexia em `repsMax` | ✅ fallback para `repsMin` quando `repsMax` é nulo. |
| 6 | Nomes de exercício sempre em inglês (não usa `namePt`) | ⚠️ **Aceito** — idioma base do sistema é inglês UK; nome do exercício é conteúdo. Fica como está. |

Correções verificadas por `tsc` limpo + inspeção; o caminho feliz (criar/salvar/persistir/progressão/regressão) já validado pelo QA acima usa as mesmas chamadas de API — as correções só mudam a re-seleção pós-resposta (lida do GET, que o cenário 3 confirmou).

## Critérios de aceite
- [x] Cenários da T-21 passando.
- [x] Regressão: a ficha do paciente da BPR (clínica) fica sem a aba.

**Conclusão: APROVADO.**
