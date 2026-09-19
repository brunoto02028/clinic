# T-2: Permissões padrão por clínica

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Admin configura, uma vez, quais módulos/permissões todo paciente novo já recebe ao se cadastrar
— sem precisar conceder manualmente um por um depois.

## Contexto
Ver `plan.md` decisão 2 e contexto técnico. `lib/patient-access.ts` `computePatientAccess()` já
sabe misturar várias fontes de permissão (sempre-visível, plano, pacote pago, overrides do
paciente) — este trabalho acrescenta mais uma fonte, o **padrão da clínica**, com prioridade
entre "sempre visível" e "plano/pacote" (um plano pago sempre pode dar mais acesso que o padrão;
o padrão nunca reduz o que um plano já concede).

## Passos
1. `prisma/schema.prisma`: `Clinic.defaultPatientModuleOverrides Json?` — mesmo formato que
   `User.moduleOverrides` já usa hoje (conferir o shape exato lendo como `moduleOverrides` é
   lido/escrito em `lib/patient-access.ts` e na tela de permissões por-paciente).
2. `lib/patient-access.ts`: em `computePatientAccess()`, misturar
   `clinic.defaultPatientModuleOverrides` na composição final, na posição certa (depois de
   sempre-visível, antes de plano/pacote — nunca sobrepõe o que o paciente já tem por override
   próprio ou por pacote pago).
3. Tela de admin: adaptar `app/admin/patients/[id]/permissions/page.tsx` (ou extrair o
   miolo de seleção de módulo num componente compartilhado) pra uma nova rota/tela que edita o
   padrão da clínica em vez de um paciente específico — decidir durante a implementação o lugar
   certo na navegação (ex.: dentro de "Patient Permissions" como o Bruno pediu, com uma aba
   "Default" ao lado de "Per-patient", ou uma tela própria).
4. Encontrar e listar TODOS os pontos onde um `User` com `role: PATIENT` é criado (cadastro
   público `/join/[slug]`, Google OAuth em `lib/auth-options.ts`, criação manual pelo admin, e
   qualquer outro que aparecer numa busca por `prisma.user.create` com `role: "PATIENT"`) e
   aplicar `clinic.defaultPatientModuleOverrides` (se configurado) como `moduleOverrides` inicial
   do novo `User`.
5. Confirmar que isso NÃO é retroativo — só afeta criações novas, nunca atualiza pacientes já
   existentes.

## Arquivos afetados
- `prisma/schema.prisma`
- `lib/patient-access.ts`
- `app/admin/patients/[id]/permissions/page.tsx` (ou novo arquivo derivado dele)
- Nova rota de API para ler/gravar o padrão da clínica
- Todos os pontos de criação de `User role: PATIENT` encontrados no passo 4

## Critérios de aceite
- [ ] Admin consegue abrir uma tela, marcar um conjunto de módulos como padrão, salvar.
- [ ] Paciente que se cadastra DEPOIS de configurado já nasce com esses módulos liberados
      (confirmar via `computePatientAccess` ou a UI do paciente logo após o cadastro).
- [ ] Paciente que já existia ANTES da configuração não muda em nada.
- [ ] Pacote pago / plano continuam concedendo o que já concediam, sem regressão.
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
