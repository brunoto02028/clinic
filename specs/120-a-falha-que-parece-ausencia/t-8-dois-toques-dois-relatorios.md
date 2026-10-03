# T-8: Dois toques no botão, dois relatórios

**Status:** feita (02/10/2026)
**Depende de:** nenhuma

## Objetivo

Que dois pedidos ao mesmo tempo produzam **um** relatório, e não dois.

## Contexto

`lib/relatorio-a-pedido.ts` define `INTERVALO_ENTRE_PEDIDOS_MS = 10 min`, e a
rota aplica-o assim:

1. lê o último relatório a pedido do paciente;
2. se tem menos de dez minutos, devolve-o;
3. senão, **gera**.

Entre o passo 1 e o passo 3 não há nada. Dois toques no mesmo segundo — ou dois
contentores a servir o mesmo paciente — leem os dois "não há nenhum recente" e
geram os dois. O comentário do ficheiro diz que o tecto existe porque *"gerar um
são nove consultas pesadas ao banco"*: na condição de corrida, são dezoito.

## Passos

1. Uma chave única que torne o segundo pedido impossível em vez de improvável.
   A mais simples: `@@unique([patientId, cadence, periodStart, periodEnd])` em
   `PatientReport` para a cadência `ON_DEMAND` — dois pedidos do mesmo período
   colidem no banco.
2. O `create` passa a apanhar a violação de unicidade e, nela, devolver **o que
   já existe** — que é o mesmo comportamento do reaproveitamento, pelo mesmo
   motivo: para quem pediu não faz diferença.
3. Se a chave única não servir (relatórios do mesmo período com conteúdo
   diferente são legítimos para a clínica), a alternativa é um `upsert` pela
   mesma chave. Decidir com o Bruno antes de implementar.
4. O tecto de dez minutos **fica**: a chave única fecha a corrida, o tecto evita
   o trabalho repetido.

## Arquivos afetados

- `prisma/schema.prisma`
- `app/api/patient/reports/route.ts`
- `lib/relatorio-a-pedido.ts`
- `__tests__/wearables/dois-pedidos-um-relatorio.test.ts` (novo)

## Critérios de aceite

- [ ] Dois pedidos em paralelo produzem **um** registo
- [ ] Os dois recebem um `id` válido e o mesmo
- [ ] O tecto de dez minutos continua a devolver o último
- [ ] A clínica continua a poder gerar o seu (a cadência é outra)
- [ ] Confirmar `in sync` no log do contentor depois do deploy

## A resposta do Bruno, e o que ela mudou

> *"Dois relatorios do mesmo paciente. Podem sim existir, so preciso saber se nao
> sao iguais!"*

Isso **descarta os passos 1 a 3 acima**. Uma chave única pelo período proibiria o
caso que ele diz ser legítimo — e o `periodStart` carrega a hora de propósito,
com teste a dizê-lo: *"quem mediu ao meio-dia não fica preso ao retrato das nove
da manhã"*. A chave `(patientId, cadence, periodStart)` já existia e já fazia o
que devia.

O que faltava eram duas outras coisas:

1. **Saber se o papel é o mesmo.** `contentHash` — `sha256` do HTML — guardado em
   cada linha, devolvido na lista, e comparado com o do último a pedido: a
   resposta do `POST` traz `igualAoAnterior: true | false | null`. `null` quer
   dizer *"não se sabe"* (não havia anterior, ou ele é de antes da coluna), e
   **não** quer dizer "igual".
2. **Não dar 500 na colisão.** Com dois contentores a servir o mesmo paciente no
   mesmo milissegundo, o perdedor levava `P2002` na cara de quem carregou no
   botão — e o tecto de dez minutos não a fecha, porque lê **antes** de qualquer
   um dos dois ter escrito. Agora devolve o do vencedor, que é o mesmo papel.

Um erro que **não** é `P2002` continua a subir: apanhar tudo aqui transformaria
um defeito nosso em *"aqui está o seu relatório"*, que é a ausência silenciosa
outra vez.

## Critérios, medidos

- [x] A colisão devolve o do vencedor, não 500 — 3 mutações mortas
- [x] `igualAoAnterior` distingue os três estados
- [x] Dois relatórios **diferentes** continuam a poder existir
- [x] O tecto de dez minutos continua a devolver o último
- [x] Um erro que não é colisão sobe com o código dele
- [ ] `in sync` no log do contentor depois do deploy
