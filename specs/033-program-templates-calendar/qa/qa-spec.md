# QA — Atividade 33: Program Templates

## T-1: Schema + API base do template

**API**
1. `POST /api/admin/workout-templates` com `{name: "Hipertrofia 4 semanas", weeks: 4}` como personal trainer autenticado → 201, retorna template vazio (sem days).
2. `POST` sem `name` → 400.
3. `POST` com `weeks: 20` (acima do teto de 12) → 400.
4. `GET /api/admin/workout-templates` → lista só templates do próprio tenant.
5. `GET /api/admin/workout-templates/[id]` de um template de outro tenant → 404 (nunca o registro).
6. `PATCH`/`DELETE` de template de outro tenant → 404.
7. Qualquer rota acima chamada por staff de uma CLINIC sem módulo TRAINING → 404.
8. Sem sessão (sem cookie/token) → 401.

## T-2: Editor em calendário

**UI**
1. Criar template de 2 semanas → grid mostra 2×7 células vazias.
2. Adicionar exercícios num dia (ex.: Semana 1, Segunda) → salva e aparece na célula.
3. Adicionar exercícios diferentes na Semana 2, mesmo dia da semana → confirma que semanas podem ter conteúdo diferente (progressão).
4. "Copiar dia" de Semana 1/Segunda pra Semana 1/Quarta → Quarta passa a ter os mesmos exercícios.
5. "Duplicar template" → nova entrada na lista, editar a cópia não muda o original (checar no banco/API).
6. Acessar `/admin/training-programs` como staff de uma CLINIC (não personal) → nav/tela não aparece ou 404, conforme `personalOnly`.

## T-3: Atribuição em massa

**API**
1. `POST /api/admin/workout-templates/[id]/assign` com `{studentIds: [aluno1, aluno2], startDate: "2026-09-15"}` → 201/200, cria os `Workout` esperados pra cada aluno com `scheduledDate` correto por dia/semana.
2. Incluir um `studentId` de outro tenant na lista → esse aluno não recebe nada; os demais são atribuídos normalmente.
3. Verificar que os `Workout` gerados têm `templateDayId` preenchido e os exercícios batem com o template no momento da atribuição.
4. Editar manualmente o `Workout` de um aluno depois da atribuição → não afeta o template nem o `Workout` de outro aluno.

**UI**
5. No editor do template, abrir "Atribuir", selecionar 2+ alunos + data → confirmar sucesso e ver "Atribuído a N alunos" atualizado.

## T-4: Sincronização manual

**API**
1. Depois de atribuir, editar um exercício no template (T-2) e chamar `POST .../sync` → `Workout` futuros (`scheduledDate >= hoje`, sem `WorkoutLog`) são atualizados; retorno informa quantos.
2. Registrar um `WorkoutLog` num desses `Workout` (simulando aluno que já treinou) e sincronizar de novo → esse `Workout` específico NÃO é alterado (checar exercícios antes/depois).
3. `Workout` com `scheduledDate` no passado não é alterado pela sincronização.

**UI**
4. Botão "Enviar atualizações" mostra confirmação com contagem de quantos serão atualizados vs. pulados antes de confirmar.

## T-5: Visão do aluno

**API/Mobile**
1. `GET /api/mobile/workouts` de um aluno só com treino manual (sem programa) → resposta idêntica à de antes desta atividade (sem regressão).
2. Mesmo endpoint pra aluno com treinos de programa → resposta inclui `scheduledDate`/`templateDayId`.

**UI**
3. Tela mobile/web do aluno com programa atribuído → treinos aparecem agrupados por data, "hoje" destacado.
4. Tela do aluno só com treino recorrente → visual idêntico ao anterior à atividade.

## T-6: Gating + regressão

1. Fluxo manual completo do `WorkoutBuilder` (criar/editar/excluir treino avulso por aluno) sem usar nada de Program Templates → idêntico ao comportamento antes desta atividade.
2. Apagar um `WorkoutTemplate` com alunos atribuídos → os `Workout` desses alunos continuam existindo e visíveis, só sem `templateDayId` (verificar no banco).
3. Todas as rotas novas: staff de CLINIC sem TRAINING → 404; cross-tenant → 404.
