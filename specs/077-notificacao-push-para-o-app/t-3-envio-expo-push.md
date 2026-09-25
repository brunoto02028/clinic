# T-3: O envio - Expo Push, em lote, com recibo

**Status:** pendente
**Depende de:** T-2

## Objetivo
Uma funcao de envio que as duas metades usam: o aviso geral (T-4) e o individual (T-5).

## Contexto
`lib/push-send.ts` aponta para a API legada do FCM, **desligada em junho/2024**. E reescrita, nao
remendo. O servico da Expo aceita **100 mensagens por chamada** e responde um ticket por mensagem;
o recibo vem depois e e onde `DeviceNotRegistered` aparece - o sinal de que o token morreu.

Sem tratar o recibo, a lista de tokens so cresce e um dia a maioria e fantasma.

## Passos
1. `lib/push-send.ts` reescrito: `sendPushToUsers(userIds, payload)` e `sendPushToUser`.
2. Lotes de 100, com `outboundAllowed`/`logSunk` respeitados (e o que mantem QA sem mandar nada).
3. Guardar os tickets; rotina de recibo que desativa token com `DeviceNotRegistered`.
4. Nenhum dado clinico no corpo - a notificacao aparece na tela bloqueada.
5. Falha do servico nao derruba quem chamou: devolve contagem e erro, nao excecao.

## Arquivos afetados
- `lib/push-send.ts`, possivelmente `prisma/schema.prisma` (ticket/recibo)

## Criterios de aceite
- [ ] 250 destinatarios viram 3 chamadas, nao 250
- [ ] Token morto e desativado e nao e tentado de novo
- [ ] Servico fora do ar: registra a falha, nao quebra a rota
- [ ] Com `OUTBOUND_MODE=sink`, nada sai
