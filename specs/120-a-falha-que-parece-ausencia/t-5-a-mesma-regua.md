# T-5: `temTracado` e o papel usam a mesma régua

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Que quem **lista** um ECG e quem o **desenha** decidam com o mesmo critério.

## Contexto

Duas réguas diferentes para a mesma pergunta:

- `lib/ecg-tem-sinal.ts` responde `signal IS NOT NULL` — há um JSON lá;
- `lib/ecg-tracado.ts`, `tracadoEmPapel`, devolve `null` quando há menos de
  **duas** amostras desenháveis, ou quando o pico a pico é inferior a
  `AMPLITUDE_MINIMA_UV` (50 µV).

Logo um sinal de `[null, null]`, ou um sinal constante, faz a lista dizer *"tem
traçado"* e o papel sair com a frase *"o traçado deste registro ainda não foi
obtido"*. É a família de [[esconder-botao-nao-e-fechar-porta]]: um critério só,
lido pelos dois lados.

## Passos

1. Uma função em `lib/ecg-tracado.ts` — `sinalEDesenhavel(amostras)` — com a
   regra: ≥ 2 amostras numéricas **e** pico a pico ≥ `AMPLITUDE_MINIMA_UV`.
2. `tracadoEmPapel` passa a usá-la, em vez de repetir a conta.
3. `quaisTemTracado` deixa de responder só `IS NOT NULL`: filtra pela mesma
   regra. A consulta continua a ser uma — o `IS NOT NULL` fica como primeiro
   corte no SQL e a regra aplica-se ao que voltar.
4. A lista do app e a sondagem passam a dizer a verdade: *"tem traçado"*
   significa *"sai no papel"*.

## Arquivos afetados

- `lib/ecg-tracado.ts`, `lib/ecg-tem-sinal.ts`
- `app/api/cron/wearables-probe/route.ts` (já usa `quaisTemTracado`)
- `__tests__/wearables/a-mesma-regua-do-tracado.test.ts` (novo)

## Critérios de aceite

- [ ] Um sinal de `[null, null]` → `temTracado` falso **e** papel sem traçado
- [ ] Um sinal constante (pico a pico 0) → os dois dizem que não
- [ ] Um sinal real de 9.000 amostras → os dois dizem que sim
- [ ] `quaisTemTracado` continua a ser **uma** consulta
- [ ] Mutação: pôr a regra num dos lados e não no outro mata um teste nomeado
