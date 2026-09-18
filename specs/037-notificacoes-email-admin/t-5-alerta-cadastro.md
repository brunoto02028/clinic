# T-5: Alerta dedicado de novo cadastro (signup)

**Status:** pendente
**Depende de:** T-1

## Objetivo
O evento que motivou a atividade inteira: o Bruno passa a saber na hora que alguém se cadastrou.

## Contexto
`app/api/signup/route.ts:144` hoje só manda o template `WELCOME` pro paciente (com BCC). Mesmo padrão de alerta dedicado das outras tarefas.

## Passos
1. Em `app/api/signup/route.ts`, depois do envio do welcome email, adicionar um `sendEmail()` dedicado pro admin com:
   - Assunto: `👋 New Patient Signup: <nome>`
   - Corpo: nome, email, qual clínica/tenant (se relevante, ex. se veio por um link de estúdio específico), link pra `/admin/patients/[id]`.
2. Non-blocking, mesmo padrão try/catch.

## Arquivos afetados
- `app/api/signup/route.ts`

## Critérios de aceite
- [ ] Um cadastro novo dispara o alerta dedicado pro admin, além do welcome pro paciente.
- [ ] Cadastro que falha (ex. duplicado) não dispara alerta nenhum.
