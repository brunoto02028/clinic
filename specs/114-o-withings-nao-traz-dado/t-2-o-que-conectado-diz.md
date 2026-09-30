# T-2: O que "conectado" está dizendo

**Status:** implementada (30/09) — QA pendente
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

---

## O que foi feito

### O app ja sabia metade

Procurar antes valeu outra vez. A tela de dispositivos **ja** distinguia
`silent` e `partial` de `receiving`, ja explicava qual deles era, e ja tinha o
botao de reassinar a Withings. O comentario la dentro ate diz: *"Conectado so
dizia que a autorizacao deu certo."*

Faltavam **duas** coisas, e as duas eram a mesma confusao.

### 1. A data que a tela mostrava era a errada

Dizia **"Ultimo sync"** — que e quando falamos com o provedor, e falamos com ele
haja ou nao haja medicao. Era essa linha que fazia dias de silencio parecerem um
dia normal, e foi literalmente o que o Bruno viu: *last sync* de hoje, lista
vazia.

Passou a mostrar a **ultima leitura**, ou *"Nenhuma medicao ainda"*.

### 2. Uma ligacao podia estar `receiving` e calada ha uma semana

`delivery` responde *"o provedor prometeu avisar?"*. Nao responde *"chegou
alguma coisa?"*. Uma ligacao com a promessa em dia e o aparelho fora da tomada
ficava **verde**.

A tela passou a somar tres coisas, e qualquer uma delas tira o verde:

| | o que significa |
|---|---|
| `naoEntrega` | `silent`, `partial` ou `unchecked` |
| `calada` | nada chega ha mais dias que o limiar da clinica |
| — | e `unchecked` deixou de contar como saudavel: *"nao conseguimos confirmar"* nao e *"esta tudo bem"* |

A rota `/api/wearables/connections` passou a mandar `lastReadingAt`,
`daysSilent` e `silent`, com o limiar vindo da regra `WEARABLE_SILENCE` da
clinica — nao de um numero inventado pela tela.

## Provas

`__tests__/wearables/a-luz-verde-nao-mente.test.ts`. Por mutacao, duas: o
silencio voltar a ser verde derruba 1; a tela voltar ao "ultimo sync" derruba 1.

## Um achado de passagem, fora do escopo

`__tests__/mobile/a-consulta-vencida-no-app.test.ts` era uma **bomba-relogio**:
congelava `AGORA` em 29/09/2026 15:00Z e chamava `nextUpcoming`, que le o relogio
real. O "amanha" dele expirou hoje as 15:00Z — **um dia e pouco depois de ter
sido escrito** — e a suite passou a falhar por hora do dia.

Desarmado no teste (as datas saem do relogio real). **A saida limpa e outra:**
`nextUpcoming(lista, agora)`, como o resto daquele arquivo ja faz. Isso e codigo
de producao e fica anotado, nao mudado de passagem.
