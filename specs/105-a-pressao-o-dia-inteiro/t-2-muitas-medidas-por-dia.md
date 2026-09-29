# T-2: Muitas medidas por dia não é a mesma coisa que três

**Status:** pendente
**Depende de:** T-1

## Objetivo

Que dezenas de leituras diárias virem informação, e não ruído.

## Contexto

O aparelho da clínica mede uma vez, com alguém presente. Um bracelete mede o dia
inteiro, inclusive dormindo. Jogar as duas coisas na mesma lista transforma o
prontuário num muro de números — e o que importa some.

O que a literatura clínica usa de monitoramento ambulatorial é: **média do dia**,
**média da noite**, e o **descenso noturno** (a pressão cair à noite, ou não
cair — que é o achado que interessa).

## Passos

1. Agregar por dia: média acordado, média dormindo, máxima, mínima, e quantas
   leituras sustentam cada número — média de três leituras não é média de
   quarenta.
2. Guardar o agregado, e **não descartar** as leituras que o formaram.
3. O período de sono sai do próprio dado quando houver; senão, uma janela fixa
   dita na tela, em vez de adivinhada em silêncio.
4. Um dia com poucas leituras é mostrado como tal, nunca como um dia completo.

## Arquivos afetados
- `lib/pressao-continua.ts` (novo)
- `prisma/schema.prisma` (o agregado diário)
- `__tests__/wearables/muitas-medidas-por-dia.test.ts`

## Critérios de aceite
- [ ] Média do dia, da noite e o descenso, calculados e testados.
- [ ] Cada número diz de quantas leituras veio.
- [ ] Dia incompleto não se disfarça de completo.
- [ ] As leituras originais ficam.
