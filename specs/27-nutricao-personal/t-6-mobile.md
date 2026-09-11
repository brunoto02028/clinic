# T-6: Mobile — módulo e tela de nutrição

**Status:** pendente
**Depende de:** T-5

## Objetivo
Expor a nutrição no app: módulo `Nutrition` na home mobile do aluno personal + endpoint mobile + tela de visualização/registro. **Build EAS entra no lote de release mobile pendente** (com as telas da atividade 21) — não buildar agora.

## Contexto
Módulos em `app/api/mobile/modules/route.ts` (objetos `TREINO_DEF`, `AVALIACOES_DEF`; tenant personal retorna só esses). Endpoints mobile em `app/api/mobile/meal-plans`.

## Passos
1. `app/api/mobile/modules/route.ts` → `NUTRICAO_DEF = { key:"nutricao", name:"Nutrition", icon:"nutrition-outline", description:"Meal plans & logging" }`; incluir no retorno do tenant personal (gated em `trainingOn`) e em `withTraining`.
2. `app/api/mobile/meal-plans/route.ts` (+ logs) → paridade com o web do aluno (CORS/json helpers do padrão mobile).
3. `mobile/app/(app)/(personal)/nutricao.tsx` (ou caminho equivalente ao de workouts/avaliacoes) → tela: metas, refeições do dia, marcar feito.

## Arquivos afetados
- `app/api/mobile/modules/route.ts`
- `app/api/mobile/meal-plans/route.ts` (novo, + logs)
- `mobile/app/.../nutricao.tsx` (novo)

## Critérios de aceite
- [ ] `GET /api/mobile/modules` para tenant personal inclui `nutricao` quando training on.
- [ ] Endpoint mobile retorna o plano do aluno e aceita log.
- [ ] Tela mobile renderiza plano e registra refeição (verificado em dev/Expo).
- [ ] Anotado no plan.md que o build EAS é feito no lote de release mobile.
