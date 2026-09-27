# T-7: Pain Trend — o paciente relata por data

**Status:** pendente
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
