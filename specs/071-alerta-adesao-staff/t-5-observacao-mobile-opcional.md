# T-5: (Opcional) Observação do paciente no app mobile

**Status:** pendente
**Depende de:** T-3

## Objetivo

Fechar a paridade web↔app pra essa feature nova (ver memória
`paridade-web-app-paciente`), já que o app mobile também tem uma função
`updateProtocolItem` (`mobile/src/api/protocol.ts:42`) apontando pra mesma
rota — hoje não chamada por nenhuma tela lá, mesmo problema do lado web
antes de T-3.

## Contexto

Explicitamente opcional/separável — não bloqueia T-1/T-2/T-3/T-4. Registrada
aqui pra não virar um gap silencioso (regra de paridade do projeto), dado que
o Bruno está concluindo trabalho do app mobile numa branch separada agora.

## Passos

1. Adicionar a mesma caixa de observação na tela equivalente do app mobile,
   reaproveitando `updateProtocolItem` (`mobile/src/api/protocol.ts:42`), que
   já existe e já funciona — só falta a UI chamar.

## Arquivos afetados

- Tela de treino do app mobile (mapear o caminho exato antes de implementar)

## Critérios de aceite

- [ ] Mesmo comportamento do lado web (T-3), mesma rota.
