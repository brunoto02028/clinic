# T-6: Tocar na notificacao abre a tela certa

**Status:** pendente
**Depende de:** T-1, T-5

## Objetivo
Quem toca em "sua terapeuta respondeu ao seu video" cai no video, nao na home.

## Contexto
Notificacao que abre a home e notificacao que ensina a ignorar notificacao. O app ja usa
`expo-router`, entao o destino e uma rota.

## Passos
1. `data.url` no payload, com a rota do app.
2. Listener de resposta a notificacao que navega, inclusive com o app fechado (cold start).
3. Rota invalida ou tela indisponivel: cai na home sem quebrar.

## Arquivos afetados
- `mobile/src/lib/push.ts`, `mobile/app/(app)/_layout.tsx`

## Criterios de aceite
- [ ] App fechado, aberto pela notificacao, chega na tela certa
- [ ] App em segundo plano idem
- [ ] Rota desconhecida nao trava o app
