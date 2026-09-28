# T-2: A área da clínica é de quem é paciente dela

**Status:** implementada · revisada · QA pendente
**Depende de:** nenhuma

## Objetivo

Prontuário, exercícios e mensagens só para quem a clínica atendeu.

## Contexto

Decisão 3 do plano. `keys.add("clinica")` era incondicional: todo cadastro ganhava a área
clínica — mostrar a uma estranha o prontuário e as mensagens de uma clínica que nunca a viu é
oferecer a casa de outra pessoa.

## Passos (feitos)

1. `User.isClinicPatient` (default `false`).
2. `app/api/mobile/modules/route.ts`: `clinicaConcedida = override === true || isClinicPatient`.
   Uma concessão explícita em `moduleOverrides` continua valendo — é a clínica dizendo "este é
   meu". Uma negação explícita continua ganhando de tudo.
3. `markAsClinicPatient(patientId, clinicId)` chamado no primeiro ato clínico: agendar consulta,
   comprar pacote, triagem, exercício, nota. **Comprar exame não está na lista.**
4. Conta criada pela clínica (`/api/admin/patients`) nasce `isClinicPatient: true`.
5. `scripts/backfill-clinic-patient-flag.js`, rodado no boot (COPY no Dockerfile): marca os
   pacientes existentes por consulta, pacote, triagem, exercício ou nota SOAP. Pedido de
   laboratório **deliberadamente de fora**.

## Arquivos afetados

- `prisma/schema.prisma`, `app/api/mobile/modules/route.ts`, `app/api/admin/patients/route.ts`
- `app/api/appointments/route.ts`, `lib/lab-review-mode.ts`
- `scripts/backfill-clinic-patient-flag.js` (novo), `Dockerfile`, `start.sh`
- `__tests__/labs/clinic-patient-gate.test.ts`

## Critérios de aceite

- [x] Conta nova que comprou só exame **não** recebe `clinica`
- [x] Conta criada pela clínica recebe `clinica` desde o primeiro login
- [x] Primeiro agendamento marca a conta como paciente
- [x] Comprar exame não marca (teste explícito, porque era a confusão do desenho antigo)
- [x] `mod_clinica` negado ganha de `isClinicPatient`
- [x] Backfill marcou os pacientes existentes — 6 em produção, 26/09
- [ ] **QA:** conta nova em produção comprando exame não vê a área clínica
