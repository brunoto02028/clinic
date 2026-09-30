# T-3: A assinatura que cai em silêncio

**Status:** implementada (30/09) — QA pendente
**Depende de:** T-1

## Objetivo

Que o dado volte a chegar sozinho, e que a queda deixe de ser silenciosa.

## Contexto

A Withings desativa a assinatura quando o webhook não responde status 0 — e não
avisa ninguém. Existe `resubscribe` na integração, então alguém já previu isto; o
que falta saber é se ele roda, e se cobre todos os tipos.

**A assinatura é por tipo (`appli`):** assinar pressão não traz sono. Se só a
pressão estivesse assinada, o quadro se explicaria inteiro — pressão chegou até
24/09 e sono nunca apareceu.

## Passos

1. Listar os tipos que a clínica precisa, e os que estão assinados hoje.
2. Garantir que o webhook responde status 0 **sempre**, inclusive quando a
   gravação falha. Recusar o aviso é o que derruba a assinatura — e aí um erro de
   gravação de um dia vira silêncio de um mês.
3. Reassinar o que estiver caído, e uma verificação periódica que **avise** em
   vez de consertar calado: uma assinatura que cai toda semana é um defeito, e
   reassinar em silêncio o esconderia.
4. Respeitar o limite de 5.000 chamadas do plano gratuito.

## Arquivos afetados

- `app/api/wearables/webhook`
- `app/api/wearables/resubscribe`
- `app/api/wearables/sync`

## Critérios de aceite

- [ ] Os tipos necessários estão assinados
- [ ] O webhook responde 0 mesmo quando a gravação falha
- [ ] Assinatura caída vira aviso para a clínica, e não conserto mudo
- [ ] Dado novo no aparelho aparece no app sem ninguém apertar nada
- [ ] A contagem de chamadas num dia cheio fica longe do limite

---

## A causa, achada no codigo

A condicao no cron era esta:

```ts
if (!c.notifyCheckedAt) {
  const outcome = await subscribeAndRecord(c);
```

**A assinatura era confirmada uma vez na vida.** Na primeira corrida perguntava-se
a Withings se ela ia avisar; a resposta ficava gravada em `notifyCheckedAt`, e
ninguem voltava a perguntar.

Se a assinatura caisse depois — por expiracao, por revogacao, ou porque o nosso
webhook respondeu errado uma vez e a Withings a desativou em silencio, que e o
comportamento documentado dela — **o silencio durava para sempre**. E a tela
continuava a dizer *conectado*, com *last sync* de hoje, porque a varredura
diaria continuava a correr.

E exatamente o quadro que o Bruno descreveu.

## O conserto

`precisaReconfirmar(c)`, com tres motivos declarados:

| motivo | porque |
|---|---|
| nunca perguntamos | o caso original |
| a resposta era **incompleta** | `partial` ou `silent` — a Withings confirmou parte dos tipos, ou nenhum |
| a resposta esta **velha** | mais de 12 horas |

**Uma hora** — que na pratica quer dizer *toda corrida*.

Comecou em doze, e o Bruno pediu menos: *"assim que chegar o meu relogio vai ser
bom para testar, porque ele vai estar conectado 24 horas."* Ele tem razao, e o
numero era timido.

Mas o numero nunca foi o limitador. **O cron corria de 6 em 6 horas**, entao doze
significava reconfirmar em corridas alternadas — baixar so a constante nao teria
mudado quase nada. Os dois desceram juntos: o agendamento no Coolify passou a
`0 */2 * * *`, e a constante para uma hora, que e menos que o intervalo.

O custo e **uma chamada por conexao por corrida**. Doze corridas por dia, um
punhado de conexoes: longe das 5.000 do plano gratuito.

O `select` da consulta passou a trazer `notifyConfirmedAppli`. **Sem ele,
`deliveryState` lia `undefined` e devolvia `silent` para toda a gente**: iria
reconfirmar sempre, por uma razao falsa, e o teste passaria na mesma.

## O agendamento faz parte do conserto

| | antes | depois |
|---|---|---|
| cron `wearables-sync` | `0 */6 * * *` | `0 */2 * * *` |
| validade da confirmacao | 12 h | 1 h |
| reconfirma de facto | de 12 em 12 h | **toda corrida — de 2 em 2 h** |

Fica escrito aqui porque e infraestrutura e nao aparece no diff: quem ler so o
codigo ve a constante e nao ve o cron, e a constante sozinha nao responde
"de quanto em quanto tempo isto acontece".

Um teste cobra que a constante **nao seja maior que o intervalo do cron**. Se
alguem voltar a subi-la sem mexer no agendamento, cai.

## Provas

`__tests__/wearables/a-assinatura-e-reconfirmada.test.ts`. Por mutacao, duas:
voltar a `!c.notifyCheckedAt` derruba 2; tirar o ramo do `partial` derruba 1.

A primeira versao do teste **acusava a propria correcao** — proibia
`!c.notifyCheckedAt` em qualquer forma, e a funcao nova usa essa condicao como
primeiro dos tres motivos. Passou a distinguir pela chaveta: o defeito era o `if`
com corpo dentro do laco.

Suite: **2963 testes, 12 suites de wearables** verdes. `tsc` em 0.
