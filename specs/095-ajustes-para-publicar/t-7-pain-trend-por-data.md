# T-7: Pain Trend — o paciente relata por data

**Status:** feita (27/09) — em QA
**Depende de:** nenhuma

## Objetivo

O paciente registra a dor **de um dia que já passou**, em vez de só a de hoje.

## Contexto

Palavras do Bruno: *"Ali no Pain Trend por ex, quero que o paciente possa relatar
por data."*

Hoje o registro é de hoje. Quem não abriu o app no dia perde aquele ponto, e a
curva que o terapeuta olha fica com buraco — não porque a pessoa não sentiu dor,
mas porque não abriu o aplicativo.

## Passos

1. No registro de dor, um seletor de data com o dia de hoje pré-selecionado.
2. Limite para trás — trinta dias é o palpite inicial, a confirmar com o Bruno —
   e **nunca para a frente**: ninguém registra a dor de amanhã.
3. Um registro de dia que já tem valor **substitui**, e diz que substituiu.
4. Na curva, marcar o que foi preenchido depois: um ponto lançado uma semana
   atrás não tem o mesmo peso clínico que o do próprio dia, e o terapeuta
   precisa saber qual é qual.
5. A tela do painel mostra a mesma distinção.

## Arquivos afetados

- a tela de dor no app e a rota que grava
- `prisma/schema.prisma` (marcar quando foi lançado, além de a que dia se refere)
- o gráfico no painel

## Critérios de aceite

- [ ] Dá para registrar dor de um dia anterior
- [ ] Não dá para registrar dia futuro
- [ ] Regravar o mesmo dia substitui, e avisa
- [ ] O gráfico distingue o registro do dia do registro retroativo

---

## Metade já existia, e é bom dizer qual

Quando fui implementar, encontrei o registro por data **já pronto**, vindo da
087: a rota aceita `checkinDate`, recusa o futuro, para em catorze dias — *"além
disso não é lembrança, é reconstrução"* — e a tela do app tem o seletor de dia,
com um comentário citando o próprio Bruno pedindo isso.

O limite ficou em **14 dias**, e não nos 30 que eu havia suposto no plano: o
número que está lá foi escolhido com uma razão escrita, e trocá-lo por um palpite
meu seria piorar a decisão de alguém que pensou nela.

## O que faltava

O gráfico não dizia **quando o ponto foi escrito**. Um ponto lançado uma semana
depois é memória, não medição — a dor lembrada é reconstruída —, e quem lê uma
tendência para decidir tratamento precisa saber qual é qual.

- A rota devolve `retroativo`, comparando `createdAt` com `checkinDate`. **Sem
  coluna nova:** o dado já estava lá.
- No gráfico, o ponto retroativo é **oco**. Forma, e não cor: a cor da linha da
  dor já significa outra coisa, e forma se distingue sem depender de enxergar
  bem.
- A legenda aparece **só quando existe um ponto assim**. Explicar uma marca que
  não está na tela é ruído; não explicar a que está é pior.
