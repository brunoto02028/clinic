# QA Spec — Atividade 29 (Challenges do personal)

Tenant PERSONAL_TRAINER (TRAINING on) com admin + 2 alunos + logs semeados (WorkoutLog/MealLog) + tenant CLINIC (regressão). Locale en-GB. Fixtures criadas e limpas.

## T-1 Modelo
- `prisma validate` ok; tabelas `Challenge`/`ChallengeParticipant`; client expõe. Gamificação clínica e logs inalterados.

## T-2 Lib
- **Unit** `validateChallenge`: título vazio / target 0 / endsAt≤startsAt / metric inválida → erro; válido → null.
- **Unit** `progressFor` WORKOUT_COUNT conta WorkoutLog com set completed na janela; MEAL_LOG_DAYS conta dias distintos de MealLog na janela.
- **Unit** `leaderboard` ordena desc + marca completos; `currentStreak` conta dias consecutivos.

## T-3 API admin
- POST cria desafio; GET lista do tenant (com nº participantes); GET [id] retorna leaderboard ordenado.
- PATCH edita/archive; DELETE remove/arquiva.
- Sem sessão 401; desafio/tenant de outro tenant 404; inválido 400; **tenant CLINIC → negado (gate)**.

## T-4 UI admin + nav
- **UI** Seção "Challenges" aparece no admin do personal; **não** aparece na clínica (novo flag `personalOnly`). Clínica mantém suas seções (regressão da nav).
- **UI** Criar desafio (WORKOUT_COUNT/MEAL_LOG_DAYS + target + datas); listar; abrir → leaderboard ordenado; archive.

## T-5 Aluno
- **UI** Aluno personal em `/dashboard/challenges`: vê desafios ativos, entra (Join), barra de progresso reflete seus logs, leaderboard, streaks no topo. Empty-state sem desafios.
- **API** join idempotente (2x → 1 participação); progresso computa dos logs; sair (se implementado).
- **Scope** aluno não entra/vê desafio de outro tenant (404).
- **UI portal** seção "Challenges" no aluno personal, ausente no clínico; `/dashboard/challenges` (clínico) → redirect `/dashboard`.
- **E2E** aluno com N WorkoutLog na janela → progresso = N; ao atingir target → `completedAt` gravado; leaderboard reflete.

## Gaps do plano (cobertura extra)
- **G7 (crítico)** clínica NÃO vê a seção "Challenges" (o flag `personalOnly` filtra no ramo `!isPersonal`); nav clínica idêntica à de antes.
- **G3** leaderboard de N participantes = 1 query (sem N+1); WORKOUT_COUNT só conta log com ≥1 set `completed`.
- **G2** aluno que entra depois do início ainda leva a janela inteira (declarado); logs fora da janela não contam.
- **G4** fronteira de dia em UTC (coerente com MEAL_LOG_DAYS da nutrição).
- **G5** `completedAt` gravado só na leitura do aluno, idempotente (2 GETs → 1 write, sem regressão); GET do admin não escreve.
- **G8** editar target pra cima limpa `completedAt` de quem não satisfaz mais.
- **G9** MEAL_LOG_DAYS num estúdio sem nutrição = progresso 0 (declarado); form sinaliza.
- **G10** streak conta dias consecutivos terminando hoje/ontem (carência).

## T-6 Gating + regressão
- CLINIC: nenhuma superfície de Challenges (admin/portal); nav clínica inalterada.
- PERSONAL: tudo presente/funcional.
- Journey clínico (PatientProgress/WeeklyChallenge/achievements) e logs sem regressão.
