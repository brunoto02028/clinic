# T-5: Tenants — tipo, idioma e "aceitando pacientes"

**Status:** implementada · revisada · QA pendente
**Depende de:** nenhuma

## Objetivo

Um médico, um psicólogo ou um nutricionista pode existir como tenant, declarar em que idiomas
atende, e só aparecer quando alguém decidir.

## Contexto

Pedido do Bruno: *"ao criar um novo tenant, por exemplo, um médico, e esse médico for da língua
portuguesa, eu quero poder associar só para aqueles usuários que são da língua portuguesa, e
assim para a língua inglesa. E também outros profissionais... até psicólogo, se for o caso."*

Decisão 7 do plano: um médico que só fala português não aparece para quem lê o app em inglês,
porque aquela consulta não aconteceria.

## Passos (feitos)

1. `enum TenantType` ganhou `DOCTOR`, `PSYCHOLOGIST`, `NUTRITIONIST`, `OTHER_PROFESSIONAL`.
2. `Clinic.languages String[] @default([])` e `Clinic.acceptingPatients Boolean @default(false)`.
3. `lib/provider-directory.ts` — `servesLanguage()` e `providersFor(patientId)`, filtrando por
   `acceptingPatients` **e** idioma, e excluindo o próprio tenant da pessoa.

## Arquivos afetados

- `prisma/schema.prisma`, `lib/provider-directory.ts` (novo)
- `__tests__/tenant/provider-directory.test.ts`

## Critérios de aceite

- [x] Tenant que só declara `pt` não aparece para quem lê em `en`
- [x] Tenant com `languages: []` aparece para todos (nunca desaparece por omissão)
- [x] `acceptingPatients: false` não aparece, seja qual for o idioma
- [x] O próprio tenant da pessoa não aparece na lista dela
- [ ] **QA:** um tenant `DOCTOR` de teste criado e conferido nos dois idiomas
- [ ] **Falta produto:** agendar com esse tenant não existe — só o modelo e o diretório. Está em
      "Fora do escopo" no plano, e continua fora.
