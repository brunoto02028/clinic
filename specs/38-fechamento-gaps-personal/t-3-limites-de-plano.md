# T-3: Limites de plano por tenant

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
O Bruno (SUPERADMIN) consegue ver e definir quantos terapeutas/pacientes um tenant pode ter, e o sistema respeita esse limite na hora de criar gente nova.

## Contexto
`ClinicSubscription.maxTherapists`/`maxPatients` já existem no schema, sem tela nem enforcement. O diálogo "Clinic Settings" (atividade 36, em `app/admin/clinics/page.tsx`) já existe e hoje só tem o toggle do Instagram Import — este é o lugar natural pra crescer, não uma tela nova.

## Passos
1. `app/admin/clinics/page.tsx`: adicionar no diálogo "Clinic Settings" dois campos numéricos — "Max therapists"/"Max patients" (0 ou vazio = sem limite), lendo/salvando em `ClinicSubscription` (criar a subscription se ainda não existir pra esse tenant).
2. `app/api/admin/clinics/[id]/route.ts` (ou uma rota dedicada, se fizer mais sentido dado que os limites vivem em `ClinicSubscription`, não em `Clinic`): aceitar e persistir os dois campos.
3. Enforcement — nos pontos de criação de conta:
   - Paciente/aluno novo (`app/api/signup/route.ts`, `app/api/admin/patients/route.ts` se houver criação manual pelo admin): antes de criar, contar quantos pacientes ativos o tenant já tem; se >= `maxPatients` (quando configurado), recusar com mensagem clara (ex. "Este studio atingiu o limite de alunos do plano atual").
   - Staff novo (`app/api/admin/users/route.ts` ou equivalente): mesma checagem pra `maxTherapists`.
4. Sem limite configurado (`null`/vazio) = sem enforcement nenhum, comportamento de hoje.

## Arquivos afetados
- `app/admin/clinics/page.tsx`
- `app/api/admin/clinics/[id]/route.ts`
- `app/api/signup/route.ts`
- Rota(s) de criação de staff/paciente pelo admin

## Critérios de aceite
- [x] SUPERADMIN define um limite de pacientes pra um tenant de teste, salva, persiste.
- [x] Tenant no limite: uma tentativa de cadastro novo é recusada com mensagem clara.
- [x] Tenant abaixo do limite: cadastro segue normal.
- [x] Tenant sem limite configurado: nenhuma mudança de comportamento.
- [x] Reduzir o limite abaixo da contagem atual não afeta quem já existe (só bloqueia gente NOVA).

## Resultado
`lib/tenant-limits.ts` (`checkPatientLimit`/`checkTherapistLimit`) aplicado nos 4 pontos de criação de conta (web signup, admin cria paciente, admin cria staff, e app mobile — este último achado só na revisão de código). UI no diálogo "Clinic Settings" com 2 campos numéricos (branco = sem limite), persistindo em `Subscription` via `upsert` transacional. Revisão de código também fechou um bypass real (rota de criação de staff aceitava `role: "PATIENT"` sem checar o limite de pacientes) e tornou o save do diálogo atômico. QA e code review (2 rodadas cada) aprovados — ver `qa/report-t-3.md`.
