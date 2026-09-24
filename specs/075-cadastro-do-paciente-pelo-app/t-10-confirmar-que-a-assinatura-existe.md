# T-10: Confirmar que a assinatura existe, em vez de torcer

**Status:** concluído · **Depende de:** nenhuma

## Objetivo
Que "conectado" queira dizer "vai receber", e não "a autorização deu certo".

## Contexto
`app/api/wearables/callback/route.ts:104` assina as notificações e engole a falha:

```ts
withingsSubscribe(tokens.accessToken, callbackUrl, appli).catch((err) =>
  console.error(`[wearables/callback] notify subscribe appli=${appli}:`, err?.message)
)
```

O comentário logo acima justifica: falhar ali derrubaria a conexão na cara do paciente. Está
certo. O que falta é o passo seguinte — **ninguém confere depois**. Uma assinatura recusada deixa
um aparelho que diz "conectado" e nunca manda nada, e isso não aparece em lugar nenhum.

`withingsListSubscriptions` já existe em `lib/withings.ts:348` e **nunca é chamada**.

## Passos
1. Depois de assinar, listar (`notify action=list`) e guardar na conexão quais `appli` a Withings
   confirmou, com a data.
2. A tela de dispositivos passa a distinguir três estados: **recebendo**, **conectado mas sem
   assinatura** e **desconectado**. Hoje há dois, e o do meio é o perigoso.
3. Botão para tentar assinar de novo, sem refazer o OAuth.
4. O prontuário mostra o mesmo, para a clínica não achar que está monitorando quem não está.

## Arquivos afetados
- `app/api/wearables/callback/route.ts`, `lib/withings.ts`, `prisma/schema.prisma`
  (campo de confirmação), `mobile/app/(app)/(clinica)/wearables.tsx`, prontuário do admin

## Critérios de aceite
- [ ] Assinatura confirmada fica registrada, com data
- [ ] Assinatura recusada aparece como tal nas duas pontas, não como "conectado"
- [ ] Reassinar funciona sem refazer a autorização
- [ ] Nenhuma falha de assinatura derruba a conexão
