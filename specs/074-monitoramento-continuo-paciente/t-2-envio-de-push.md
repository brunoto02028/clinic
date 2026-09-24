# T-2: Envio de push no backend, com limpeza de token morto

**Status:** pendente
**Depende de:** T-1

## Objetivo
Uma função que entrega push a um paciente ou à equipe de uma clínica, e que remove sozinha os
tokens que o provedor declarar mortos.

## Contexto
Decisão D4: push reforça o e-mail, não substitui. Decisão D1: alerta para a clínica é automático;
para o paciente passa pela fila da 072, exceto em crise.

## Passos
1. `lib/push.ts`: `sendPushToUser(userId, {title, body, data})` e `sendPushToClinicStaff(clinicId, ...)`.
2. Falar com a Expo Push API em lotes de até 100, como a documentação deles exige.
3. Ler os *receipts*: `DeviceNotRegistered` apaga o token; os demais erros só logam.
4. Nunca lançar para o chamador — push que falha não pode derrubar o salvamento de uma leitura.
5. Respeitar as preferências de T-5 quando existirem (por ora, enviar sempre).

## Arquivos afetados
- `lib/push.ts` (novo)
- `__tests__/push/` (novo)

## Critérios de aceite
- [ ] Token inválido é removido do banco depois do receipt
- [ ] Lote maior que 100 é dividido
- [ ] Falha do provedor não propaga exceção ao chamador
- [ ] Paciente sem nenhum token não gera erro
