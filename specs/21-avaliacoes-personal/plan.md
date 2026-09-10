# Atividade 21 — Avaliações do personal trainer

## Objetivo
Dar ao personal (tenant `PERSONAL_TRAINER`) tudo que ele precisa para **avaliar e acompanhar** o aluno, no admin dele e refletido na área do aluno (web + app):
- **Antropometria:** peso, altura, IMC.
- **Circunferências/medidas:** pescoço, tórax, cintura, quadril, braço (relaxado/contraído), coxa, panturrilha… + relação cintura-quadril (RCQ).
- **Composição corporal (%GC)** por três métodos: **entrada manual**, **bioimpedância** (campos da balança) e **dobras cutâneas** (Jackson-Pollock 3/7 pontos → densidade → Siri). Deriva massa magra/gorda.
- **Fotos de progresso** (frente/lado/costas, por data) — **com consentimento explícito**.
- **Testes físicos:** FC de repouso, PA (opcional), e **estimativa de 1RM** derivada dos logs de treino (T-22) via Epley.
- **Tendências/evolução** e **catálogo de tipos de avaliação** que o PT oferece.

Tudo **tenant+aluno scoped**, reusando os padrões de acesso das atividades 20 (`tenant-access`, `assertStudentTrainingAccess`), **sem tocar no `BodyAssessment` clínico** (que é postura/marcha por imagem e fica só para a clínica).

## Princípios
1. **Módulo do personal, não clínico.** Modelos novos (`StudentAssessment`, `AssessmentPhoto`) — o `BodyAssessment` clínico não é reutilizado nem alterado.
2. **Gate por tipo de tenant + posse.** Staff do tenant acessa avaliações de alunos do próprio tenant; o aluno vê só as suas. Gate do módulo TRAINING (default-on no personal).
3. **Migrações aditivas**, como na atividade 20. Deploy pelo push (backend); telas do app via EAS.
4. **Unidades métricas** (kg, cm). Idioma base inglês UK.
5. **Ciclo por tarefa:** implementar → qa-tester (`qa/report-t-N.md`) → code review → concluído. QA sempre no banco local com fixtures de 2 tenants.

## Decisões de design
| # | Decisão | Por quê |
|---|---|---|
| D1 | `StudentAssessment`: escalares centrais (date, weightKg, heightCm, bodyFatPct, bfMethod, restingHr, systolic, diastolic) + JSON `girths`, `skinfolds`, `bia` + `notes`. Computados no servidor: bmi, leanMassKg, fatMassKg, whr | Um registro datado por avaliação; flexível sem explodir colunas |
| D2 | %GC por `bfMethod` = `MANUAL` \| `BIA` \| `SKINFOLD`. MANUAL: entra %GC. BIA: entra números da balança. SKINFOLD: dobras + idade + sexo → densidade (Jackson-Pollock) → %GC (Siri) | Cobre os três fluxos que o Bruno pediu |
| D3 | Sexo do aluno (necessário p/ dobras) e altura: capturados no perfil do aluno **ou** por avaliação; guardados no `StudentAssessment` para histórico | JP precisa de sexo/idade; idade vem do `dateOfBirth` existente |
| D4 | `AssessmentPhoto`: R2, pose (FRONT/SIDE/BACK), ligada à avaliação. Só após **consentimento** (`photoConsentAt` no aluno, capturado no onboarding/primeiro upload) | Dado sensível; consentimento explícito |
| D5 | 1RM estimado por **Epley** a partir dos `WorkoutSetLog` (reps+carga), exibido no progresso — não é um campo digitado | Reusa dados que já temos (T-22), sem duplicar |
| D6 | Catálogo de tipos de avaliação = `TreatmentType` categoria `ASSESSMENT_SERVICE` por tenant (já existe), exposto no fluxo do personal | Não cria modelo novo para "o que o PT oferece" |
| D7 | Área do aluno reusa `/dashboard/workouts` como padrão → nova `/dashboard/assessments` (web) e grupo `(avaliacoes)` no app | Mesma arquitetura já validada (T-22/T-23) |

## Tarefas
| T-N | Trilha | Nome | Status |
|-----|--------|------|--------|
| T-1 | PERSONAL | Modelo + API de avaliações (antropometria, medidas, composição, cálculo %GC) | concluído (QA jest 14 + runtime 54/54; review feito) |
| T-2 | PERSONAL | Fotos de progresso + consentimento (R2) | pendente |
| T-3 | PERSONAL | Aba "Assessments" na ficha do aluno (registrar + histórico + tendências) | pendente |
| T-4 | PERSONAL | Área do aluno na web (`/dashboard/assessments`): ver medidas/composição/fotos + evolução | pendente |
| T-5 | PERSONAL | Módulo Avaliações no app do aluno (mirror) | pendente |
| T-6 | PERSONAL | 1RM (Epley) dos logs + dobrar curvas de composição no painel de Progresso (T-24) | pendente |
| T-7 | PERSONAL | Catálogo de tipos de avaliação do tenant (`TreatmentType`/ASSESSMENT_SERVICE) no fluxo | pendente |

## Suposições (validar com o Bruno)
1. **Unidades métricas** (kg/cm); sem suporte a imperial no v1.
2. **Sexo** do aluno é necessário para dobras cutâneas — capturamos um campo `sex` (M/F) no perfil do aluno; para outros casos, o método SKINFOLD fica indisponível e usa-se MANUAL/BIA.
3. **Fórmulas:** densidade por **Jackson-Pollock** (3 e 7 pontos), %GC por **Siri**. IMC = kg/m². RCQ = cintura/quadril. 1RM = Epley (`carga × (1 + reps/30)`).
4. **Fotos** ficam no R2 (já usado no projeto), com consentimento explícito guardado; visíveis ao PT e ao aluno; não a outros tenants.
5. **App** (T-5) entrega por EAS (fora do push) — backend deploya pelo push.
6. **Sem tocar** no `BodyAssessment` clínico nem no fluxo da clínica.
