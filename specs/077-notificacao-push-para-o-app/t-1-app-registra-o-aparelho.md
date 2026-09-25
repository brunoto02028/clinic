# T-1: O app pede permissao e registra o aparelho

**Status:** pendente
**Depende de:** nenhuma (mas sem T-2 o registro nao tem onde chegar)

## Objetivo
O app passa a existir para o servico de push: pede permissao na hora certa, pega o token da Expo e
manda para o servidor.

## Contexto
`expo-notifications` e dependencia nativa - so passa a valer num build novo. A permissao do iOS e
pedida **uma vez**: negada, o sistema nao pergunta de novo, e a saida e `Linking.openSettings()`,
como `src/lib/ask-permission.ts` ja faz para camera e galeria.

Pedir logo no primeiro segundo do app e o jeito mais rapido de ouvir "nao". O pedido acontece
**depois do login**, quando a pessoa ja sabe o que o app e.

## Passos
1. `npx expo install expo-notifications expo-device`.
2. `src/lib/push.ts`: `registrarParaPush()` - checa aparelho fisico, le permissao, pede se ainda
   nao perguntaram, pega `getExpoPushTokenAsync({ projectId })` e manda para a rota da T-2.
3. Chamar depois do login bem-sucedido e na volta ao primeiro plano, sem repetir pedido negado.
4. Canal padrao no Android (`setNotificationChannelAsync`), senao a notificacao chega muda.
5. No logout, desativar o token (a rota da T-2 ja preve `DELETE`).

## Arquivos afetados
- `mobile/src/lib/push.ts` (novo), `mobile/src/store/auth.ts`, `mobile/app.json` (plugin), `mobile/package.json`

## Criterios de aceite
- [ ] Em aparelho fisico, o token aparece no banco ligado ao paciente certo
- [ ] Permissao negada: nenhuma insistencia, e um caminho para os Ajustes
- [ ] Simulador nao quebra o app (push nao existe la - tem que degradar em silencio)
- [ ] Logout desativa o token daquele aparelho
