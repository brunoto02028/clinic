# T-10: A resposta guardada, em vez de recalculada a cada leitura

**Status:** pendente
**Depende de:** T-5

## Objetivo

Que *"este ECG desenha?"* deixe de custar uma varredura de 9.000 amostras por
gravação, a cada abertura da aba Saúde.

## Contexto

A T-5 pôs a régua do papel dentro do `quaisTemTracado`, em SQL. Funciona e está
medida (16 de 16 casos), mas o QA mediu o custo:

| consulta | mediana |
|---|---|
| `quaisTemTracado` | **~60 ms** |
| `select: { id, signal }` — o que o módulo existe para evitar | **~17 ms** |

A régua custa **3,5×** o `select` que ela substitui. A troca é ~43 ms de CPU do
Postgres por 281 KB que não atravessam a rede, e em `localhost` a rede é grátis
— em produção, com o banco noutro contentor, a conta muda de sinal, mas o
`jsonb_array_elements` com um `::numeric` por elemento são 90.000 casts por
chamada de qualquer maneira.

E isto corre em `app/api/wearables/data/route.ts`, a aba Saúde do paciente, a
cada abertura.

O docblock do módulo diz que a resposta *"custava as 9.000 amostras"*. Já não é
verdade e está corrigido no ficheiro, mas a justificação do módulo deixou de se
medir.

## Por que não foi feito já

O mesmo docblock recusa explicitamente uma coluna: *"seria um segundo sítio a
dizer a mesma coisa, que pode ficar a discordar do primeiro"*. A objeção é real,
e a resposta é que uma coluna escrita **no único sítio que escreve o sinal**,
pelo `sinalEDesenhavel`, é um **cache** e não uma segunda regra — desde que um
teste o force.

O que isto exige, e é por isso que é tarefa própria:

1. uma coluna nova (`db push`, que engole a falha — ver a T-3);
2. um **backfill** das gravações existentes, que é a parte que não se improvisa;
3. decidir o que responder sobre uma linha antiga, ainda sem valor: `null` não
   pode significar *"não desenha"*, senão é a ausência silenciosa outra vez.

## Passos

1. `EcgRecording.desenhavel Boolean?` — `null` quer dizer **"ainda não se
   sabe"**, e não "não".
2. A ingestão escreve-a com `sinalEDesenhavel(amostras, frequencia)`, no mesmo
   `update` do traçado e com `select: { id: true }`.
3. `quaisTemTracado` responde pela coluna **quando ela não é `null`**, e cai na
   varredura em SQL quando é — logo nenhuma gravação antiga passa a mentir.
4. Um script de backfill, corrido uma vez, que preenche as antigas.
5. Um teste que force a coluna e a função a concordarem: se o
   `sinalEDesenhavel` mudar de regra, a coluna fica errada e o teste cai.

## Arquivos afetados

- `prisma/schema.prisma`
- `lib/ecg-tem-sinal.ts`, `lib/withings-ingest.ts`
- `scripts/` (o backfill)
- `__tests__/wearables/a-regua-guardada-concorda.test.ts` (novo)

## Critérios de aceite

- [ ] `quaisTemTracado` com 10 gravações de 9.000 amostras custa menos do que o
      `select: { id, signal }` — medido, não presumido
- [ ] Uma gravação antiga sem a coluna continua a dar a resposta certa
- [ ] `null` na coluna **nunca** se lê como "não desenha"
- [ ] Mutação: mudar a regra no `sinalEDesenhavel` sem reescrever a coluna mata
      um teste nomeado
- [ ] Confirmar `in sync` no log do contentor depois do deploy
