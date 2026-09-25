# T-1: Prescrever libera o modulo de exercicios

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Um paciente com prescricao ativa passa a ter `mod_exercises`, independente de pacote ou plano.

## Contexto
`computePatientAccess` concede modulos por: sempre-visivel, default, estudio de personal,
assinatura, tratamento pago e override. **Prescricao nao esta na lista** — e e o ato que cria a
necessidade do modulo.

A ordem do calculo importa: o laco de overrides roda **depois** de todas as concessoes, entao um
`hidden` continua tendo a ultima palavra.

## Passos
1. `PATIENT_ACCESS_SELECT` passa a trazer `receivedExercises` com `where: { isActive: true }`,
   `take: 1` — precisa saber se existe, nao quantas sao.
2. `computePatientAccess`: se houver ao menos uma, `grantModule("mod_exercises", "prescription")`.
3. Novo motivo `"prescription"` no tipo `GrantReason`, para a tela de permissoes do admin poder
   explicar de onde veio o acesso.
4. Conferir todos os `findUnique`/`findMany` que usam o select — o custo e um `take: 1` indexado
   (`@@index([patientId])`, `@@index([isActive])`).

## Arquivos afetados
- `lib/patient-access.ts`

## Criterios de aceite
- [ ] Paciente sem pacote, sem plano e **com** prescricao ativa: tem `mod_exercises`
- [ ] Mesmo paciente com a prescricao desativada: **nao** tem
- [ ] Override `hidden` vence a prescricao
- [ ] Nenhum outro modulo e concedido junto
- [ ] A rota `/api/patient/exercise-submissions` deixa de responder 403 para esse paciente
