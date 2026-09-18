# T-5: Aluno (web)

**Status:** concluído
**Depende de:** T-3

## Objetivo
O aluno vê os desafios ativos do estúdio, entra, e acompanha seu progresso + leaderboard + streaks em `/dashboard/challenges`.

## Passos
1. `app/api/challenges/route.ts` (GET) → desafios ACTIVE do tenant do aluno + para cada: se o aluno participa, seu progresso; senão flag "pode entrar". Gate `assertStudentTrainingAccess`.
2. `app/api/challenges/[id]/join/route.ts` (POST) → cria `ChallengeParticipant` (idempotente via unique challenge+student); valida que o desafio é do tenant do aluno e ACTIVE.
3. `app/api/challenges/[id]/route.ts` (GET) → detalhe + leaderboard ("primeiro nome + inicial", G6) + meu progresso. **G5: gravar `completedAt` idempotente só aqui (leitura do aluno)** — `updateMany({where:{challengeId, studentId:me, completedAt:null}, data:{completedAt:now}})` quando meu progresso ≥ target. Nunca no GET do admin. Opcional DELETE (sair do desafio).
4. `app/dashboard/challenges/page.tsx` (guarda: redirect não-personal) + `components/challenges/student-challenges.tsx`:
   - Lista desafios (título, métrica, janela); botão "Join"; barra de progresso meu/target; leaderboard; **streaks** (treino/refeição) no topo.
   - Empty-state sem desafios.
5. `lib/patient-sections.ts` → seção `{ key:"challenges", label:"Challenges", labelPt:"Desafios", icon: Trophy, href:"/dashboard/challenges", personalOnly:true, matchRoutes:["/dashboard/challenges"] }`.

## Arquivos afetados
- `app/api/challenges/route.ts`, `.../[id]/route.ts`, `.../[id]/join/route.ts` (novos)
- `app/dashboard/challenges/page.tsx`, `components/challenges/student-challenges.tsx` (novos)
- `lib/patient-sections.ts`

## Critérios de aceite
- [ ] Aluno vê desafios ativos; entra (não duplica); progresso reflete seus logs; leaderboard ordenado; streaks exibidos.
- [ ] Aluno não entra/vê desafio de outro tenant (404).
- [ ] Seção "Challenges" no portal do aluno personal, não no clínico; `/dashboard/challenges` redireciona não-personal.
