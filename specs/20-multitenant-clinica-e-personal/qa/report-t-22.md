# QA T-22 — Treino do aluno + registro de séries (web)

**Atividade:** specs/20-multitenant-clinica-e-personal
**Tarefa:** T-22 (trilha PERSONAL)
**Data:** 2026-09-10
**Ambiente:** local — http://localhost:4196 (banco `bpr_clinic_local`, `OUTBOUND_MODE=sink`). Produção não tocada.
**Resultado geral:** ✅ **APROVADO (5/5 UI)** + backend (jest 18/18 validação de sessão; runtime 29/29 com S1–S4)

## Resumo (UI)
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Login aluno → /dashboard/workouts lista "Workout A" | UI | ✅ |
| 2 | Abrir "Workout A" → execução com exercício, resumo e séries pré-preenchidas | UI | ✅ |
| 3 | Marcar 3 séries + Session RPE 8 + Finish → "Session saved!" (POST 201) | UI/API | ✅ |
| 4 | History → 1 sessão registrada (data + contagem) | UI | ✅ |
| 5 | Paciente da clínica → estado vazio "No workouts assigned yet", sem banner de erro | UI | ✅ |

## Evidências
- `qa/screenshots/t-22-workouts-list.png` — lista "Workout A" ("Semana 1", "1 exercises · Mon, Wed, Fri").
- `qa/screenshots/t-22-workout-execution.png` — "QA Goblet Squat", resumo "3 sets · 8–10 reps · 40 kg · RPE 8", 3 séries pré-preenchidas (Reps 10 / Load 40 / RPE 8), timer 1:00.
- `qa/screenshots/t-22-session-saved.png` — "Session saved!"; rede: `POST /api/workouts/{id}/logs → 201`, `GET → 200`.
- `qa/screenshots/t-22-history.png` — "10/09/2026 · 3 sets · RPE 8".
- `qa/screenshots/t-22-clinic-empty-state.png` — estado vazio; rede `GET /api/workouts → 404` tratado como vazio.

## Backend (automatizado)
- **jest** `__tests__/personal/workout-validation.test.ts` — 18/18 (inclui `validateSetLog`/`validateSessionLog`).
- **suíte runtime** `npm run test:tenants` — 29/29, novos: S1 (aluno lista o próprio treino), S2 (registra sessão 201), S3 (aluno de outro tenant → log 404), S4 (série com RPE inválido → 400).

## Observações (não bloqueiam)
- Exercício da fixture **sem vídeo** → o player não renderiza (esperado). Só o ramo "sem vídeo" foi exercitado; a reprodução com vídeo real não foi coberta nesta fixture.
- No estado vazio da clínica, o Chrome loga o 404 do `GET /api/workouts` como "Failed to load resource" — é o próprio 404 do fetch (sem exceção JS); a UI mostra o estado vazio corretamente.

## Respostas ao code review (6 achados, todos endereçados)
| # | Achado | Correção |
|---|--------|----------|
| 1 | S3 não exercitava a posse (aluno de clínica cai no gate do módulo antes do check de `studentId`) | ✅ 2º aluno no MESMO tenant personal na fixture + cenários **S3b** (outro aluno → log 404 por posse) e **S3c** (lista exclui treino alheio). Runtime **31/31**. |
| 2 | Body vazio/ inválido criava `WorkoutLog` fantasma com 201 | ✅ body inválido → 400; exige ≥1 série (`Log at least one set`). |
| 3 | Duplo clique em "Finish" duplicava a sessão | ✅ `sessionSaved` desabilita o botão após salvar; editar uma série reabilita para uma nova sessão. |
| 4 | Corrida no fetch do histórico ao trocar de treino | ✅ `currentWorkoutRef` — só aplica o histórico se o treino ainda for o selecionado. |
| 5 | `notes` não-string → 500 | ✅ `validateSessionLog` valida `notes` string → 400. |
| 6 | Log aceito em treino inativo (escondido da lista) | ✅ POST rejeita `isActive:false` → 404. |

Correções verificadas por `tsc` limpo + jest 18/18 + runtime 31/31 (incl. S3b/S3c). O caminho feliz (registrar/persistir/histórico) já validado no QA de UI acima usa as mesmas chamadas.

## Critérios de aceite
- [x] Cenários da T-22 passando.

**Conclusão: APROVADO.**
