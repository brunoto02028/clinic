# QA Spec — Atividade 27 (Nutrição personal)

Tenant de teste PERSONAL_TRAINER + tenant CLINIC (regressão). Locale en-GB. Fixtures criadas e limpas.

## T-1 Modelo de dados
- **API/estrutura** — `npx prisma validate` passa; migração cria `MealPlan`/`Meal`/`MealLog` com FKs e índices; `prisma generate` expõe os clients. Models clínicos inalterados.

## T-2 Lib
- **Unit** `validateMealPlan`: nome vazio → erro; macro negativo → erro; refeição sem nome → erro; plano válido → null.
- **Unit** `sumMealMacros` soma correta; `adherence` calcula pct = logged/planned.
- **Gate** `assertNutritionAccess` com ator não-staff → AccessError; staff de outro tenant não acessa aluno.

## T-3 API admin
- **API happy** POST cria plano com 3 refeições e metas → 200 + objeto; GET ?studentId lista o plano **com logs**.
- **API editar-preserva-logs (G1)** criar plano → aluno loga 1 refeição → PUT edita descrição de uma refeição → o MealLog anterior CONTINUA (mealId estável, snapshot intacto), aderência não zera.
- **API um-ativo (G4)** criar 2º plano ACTIVE p/ o mesmo aluno → o 1º vira PAUSED.
- **API status (G5)** PATCH/PUT muda ACTIVE↔PAUSED↔ARCHIVED.
- **API notify (G3)** POST/PUT com `notifyStudent=true` → dispara notificação (verificar sink/log).
- **API** DELETE remove (meals por cascade; logs mantêm snapshot, mealId→null).
- **API inválido** POST sem nome → 400; macro negativo → 400.
- **API auth/scope** sem sessão → 401; ator de outro tenant no studentId → 404; plano de outro tenant no [id] → 404.
- **API gating** ator de tenant CLINIC nas rotas → negado (gate training).

## T-4 UI admin
- **UI empty-state** aluno sem plano → mensagem orientativa.
- **UI** Ficha do aluno (personal) mostra aba "Nutrition"; criar plano (nome+metas+refeições) salva e aparece na lista; total de macros vs metas exibido; editar e excluir funcionam.
- **UI status** botões Activate/Pause/Archive mudam o status; ativar um pausa os outros.
- **UI feed (G2)** o personal vê os logs do aluno (refeições feitas, notas, fotos), não só um número.
- **UI notify** checkbox "Notify student" presente e envia o flag.
- **UI regressão** Tenant CLINIC: aba "Nutrition" ausente; abas Workouts/Assessments do personal intactas.

## T-5 Aluno web
- **UI** Aluno personal em `/dashboard/nutrition` vê metas + refeições do dia; marca refeição feita → aderência atualiza; foto/nota opcional grava.
- **UI toggle (G6)** desmarcar refeição funciona; marcar 2x não duplica (aderência não passa de 100%).
- **UI empty-state (G5)** sem plano ACTIVE → mensagem "trainer hasn't set a meal plan yet".
- **API** `GET /api/meal-plans` retorna só o próprio plano ACTIVE; tentar logar em plano de outro aluno → negado.
- **UI portal** Seção "Nutrition" presente no sidebar do aluno personal; ausente no aluno clínico.
- **Guard** Paciente clínico em `/dashboard/nutrition` → redirect `/dashboard`.

## T-6 Mobile
- **API** `GET /api/mobile/modules` (tenant personal, training on) inclui `nutricao`; ausente para clínica.
- **API** `/api/mobile/meal-plans` retorna plano do aluno e aceita log.
- **UI** Tela mobile renderiza plano e registra refeição (Expo dev).

## T-7 Gating + vocab
- **Regressão CLINIC** admin/portal/mobile sem nutrição em lugar nenhum.
- **PERSONAL** nutrição presente e funcional em todas as superfícies; sem vocab clínico.
- **Guard** rotas personal-only inacessíveis à clínica.
