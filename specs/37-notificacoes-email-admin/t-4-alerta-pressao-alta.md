# T-4: Alerta dedicado de pressão alta (BP_HIGH_ALERT)

**Status:** pendente
**Depende de:** T-1

## Objetivo
O único evento com risco clínico direto passa a ter alerta destacado, não só BCC perdido — prioridade da atividade.

## Contexto
`app/api/patient/blood-pressure/route.ts:84-86` hoje só manda o template `BP_HIGH_ALERT` pro paciente (com o Bruno em BCC via `sendTemplatedEmail`). Seguir o mesmo padrão já usado em `app/api/medical-screening/route.ts` (bloco "Notify admin that a new screening was submitted") pra montar um `sendEmail()` dedicado.

## Passos
1. Em `app/api/patient/blood-pressure/route.ts`, depois do envio do template pro paciente, adicionar um `sendEmail()` dedicado pro admin (via `getAdminNotificationEmail`) com:
   - Assunto: `🚨 High Blood Pressure Reading: <nome da paciente>`
   - Corpo: nome da paciente, leitura (sistólica/diastólica), data/hora, link direto pra `/admin/patients/[id]`.
2. Não bloquear a resposta ao paciente se o envio falhar (mesmo padrão try/catch non-blocking já usado em todo o resto do código).

## Arquivos afetados
- `app/api/patient/blood-pressure/route.ts`

## Critérios de aceite
- [ ] Uma leitura de pressão alta dispara os dois emails: o template pro paciente (com BCC) E o alerta dedicado pro admin.
- [ ] Uma leitura normal (não alta) NÃO dispara o alerta dedicado (só o fluxo normal, se houver).
- [ ] Link no email leva pra ficha certa da paciente.
