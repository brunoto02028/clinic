# T-6: Remover a rota de reset

**Status:** pendente
**Depende de:** T-5

## Objetivo

Tirar do ar a rota que apaga a biblioteca inteira, assim que ela cumprir o
propósito.

## Contexto

Decisão 7 do plano. Mesmo ciclo já aplicado em `backfill-duration` e
`normalize-videos`: rota temporária, roda, some.

Deixá-la no ar é um botão de "apagar tudo" acessível por HTTP a qualquer conta
`SUPERADMIN` — um clique de distância de perder a biblioteca de novo, agora sem
o backup recente que motivou a operação.

## Passos

1. Confirmar com o usuário que o re-upload terminou e a biblioteca nova está de pé.
2. Apagar `app/api/admin/exercises/reset-library/route.ts`.
3. Aproveitar e remover `app/api/admin/exercises/normalize-videos/route.ts`, que
   também já cumpriu o papel — a revisão confirmou que os 147 vídeos estavam
   todos em H.264/yuv420p/mp4 com faststart, então não há o que normalizar.
4. `npx next build`, commit, PR, merge, confirmar deploy.

## Arquivos afetados

- `app/api/admin/exercises/reset-library/route.ts` (removido)
- `app/api/admin/exercises/normalize-videos/route.ts` (removido)

## Critérios de aceite

- [ ] `POST /api/admin/exercises/reset-library` responde `404` em produção
- [ ] `POST /api/admin/exercises/normalize-videos` responde `404` em produção
- [ ] Botão "Corrigir Vídeos" não aponta mais para rota inexistente (remover o
      botão junto, ou religá-lo se ainda fizer sentido)
- [ ] Build passa e o site continua no ar
