# T-1: O tipo do profissional, e criar a área dele

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Criar uma área nova escolhendo **o que ela é**: reabilitação, médico,
psicólogo, nutricionista — ou estúdio de personal, que já existe.

## Contexto

`Clinic.type` é um enum com dois valores (`CLINIC`, `PERSONAL_TRAINER`) e já
decide vocabulário e módulos. A mudança é acrescentar valores, não inventar
mecanismo.

O registro profissional (CRM, CRP, CRN) entra aqui: em consulta à distância no
Brasil, mostrar o número de quem atende é obrigação, não enfeite.

## Passos

1. `TenantType` ganha `DOCTOR`, `PSYCHOLOGIST`, `NUTRITIONIST`.
2. `Clinic` ganha `professionalRegistry` (o número) e `registryKind` (CRM/CRP/CRN).
3. A tela de criar inquilino oferece os cinco tipos, com uma frase dizendo o
   que muda em cada um.
4. `lib/tenant-type.ts` ganha os testes de tipo que faltam — e **ninguém lê
   `type === "CLINIC"` espalhado**; quem pergunta, pergunta ao helper.

## Arquivos afetados

- `prisma/schema.prisma`, `lib/tenant-type.ts`
- a tela de criação de clínica (superadmin)

## Critérios de aceite

- [ ] Criar cada um dos cinco tipos, e a área nasce com os módulos certos.
- [ ] O número de registro é obrigatório para médico, psicólogo e nutricionista.
- [ ] Uma clínica que já existe não muda de comportamento em nada.
- [ ] Nenhum `type === "..."` solto fora de `lib/tenant-type.ts`.
