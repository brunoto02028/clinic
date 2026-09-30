# T-2: O que "conectado" está dizendo

**Status:** pendente
**Depende de:** T-1

## Objetivo

Que o cartão do Withings diga a verdade sobre o que está acontecendo.

## Contexto

Hoje ele diz **"Last sync: 30 Sep 2026"** — e não há dado de 30 de setembro. Seja
qual for a causa, essa frase está errada de um jeito específico: ela não é falsa
sobre *tentar*, é falsa sobre *conseguir*.

É a mesma família de dois defeitos já corrigidos aqui: o `delivered: 1` que
contava quem não tinha recebido push, e o `buildDate` que parece novo sem nada ter
mudado. **Um número que mede a tentativa e é lido como resultado.**

## Passos

1. Separar "última tentativa" de "último dado recebido". São duas datas, e o
   cartão mostra uma só.
2. Onde a assinatura caiu ou o token expirou, o cartão diz isso **e** o que
   fazer — reconectar é ação do paciente, e ele não tem como adivinhar.
3. O mesmo no painel da clínica: se a clínica não vê que parou, ninguém vê. O
   paciente não sabe que devia haver dado.

## Arquivos afetados

- `mobile/app/(app)/(clinica)/wearables.tsx`
- a rota que alimenta o cartão, em `app/api/wearables/connections`
- a tela equivalente no painel, a definir pela T-1

## Critérios de aceite

- [ ] O cartão distingue "tentou" de "trouxe"
- [ ] Conexão quebrada é dita, com o que fazer
- [ ] Não diz "sincronizado hoje" quando o último dado é de seis dias atrás
- [ ] Com dado de hoje, diz hoje — o controle que impede o texto novo de ser
      apenas pessimista
