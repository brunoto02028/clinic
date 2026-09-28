# T-5: Novidade dentro do app, em vez de push

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

"Exame novo disponível" aparece na tela do laboratório, não numa notificação.

## Contexto

Decisão 2 do plano. Anunciar por push um produto que vendemos é marketing no Reino Unido, mesmo
chamando de "aviso". E é pior como produto: quem se incomoda desliga a notificação **inteira**,
inclusive a do resultado dela.

## Passos

1. Uma faixa no topo da tela do laboratório, alimentada pelo catálogo: exames marcados como novos
   nos últimos N dias.
2. Dispensável pela pessoa, e não volta.
3. Nenhum push, nenhum consentimento a pedir.

## Arquivos afetados

- `mobile/app/(app)/(lab)/(tabs)/index.tsx`
- `app/api/mobile/labs/catalog/route.ts` (marcar o que é novo)
- `__tests__/labs/novidade-in-app.test.ts` (novo)

## Critérios de aceite

- [ ] A faixa some quando a pessoa dispensa, e não volta
- [ ] Nenhum push é disparado por causa de catálogo
- [ ] Sem exame novo, a faixa não existe — nada de "nenhuma novidade"
- [ ] EN e PT
