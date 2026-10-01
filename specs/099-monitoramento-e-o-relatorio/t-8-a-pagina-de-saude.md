# T-8: A página de saúde — o dia, a noite, e o período

**Status:** implementada em 01/10/2026 — espera QA e a medição do que a Withings devolve
**Depende de:** T-7

## O pedido

> *"Precisamos construir também dentro do nosso app essa página da saúde desse
> monitoramento do paciente, com todas as informações e horas e minutos, assim
> como o pessoal da Withings oferece."*

## O que já existe, para não refazer

`mobile/app/(app)/(clinica)/wearable-data.tsx` mostra hoje:

- o último valor de sono, HRV, FC de repouso, SpO2, passos e calorias;
- **a tendência em 7/30/90 dias** por métrica, com buraco onde não houve leitura
  e a variação dita em palavras (T-2, 01/10);
- os registos de **ECG** do período, com a conclusão do aparelho.

O que falta é a **profundidade dentro do dia** — que é exatamente o que a T-7
vai buscar.

## O desenho

### 1. O dia, hora a hora

A série de `getintradayactivity`: frequência cardíaca ao longo do dia e passos
por hora. É o gráfico que o app deles abre primeiro, e é o que responde *"o que
aconteceu comigo hoje"*.

Eixo de 24 horas, sempre — às 9h da manhã o resto do dia está vazio **porque
ainda não aconteceu**, e isso é diferente de não ter sido medido. As duas coisas
têm de parecer diferentes na tela.

### 2. A noite, fase a fase

O hipnograma: a faixa de acordado / leve / profundo / REM ao longo da noite,
com a hora de deitar e de acordar. Abaixo, os totais que já temos.

**A forma da noite é o que se lê.** "6h30 de sono" não distingue uma noite
inteira de seis blocos partidos, e é a diferença que a pessoa sente.

### 3. O período

O que a T-2 já entregou, mantido: 7/30/90 dias por métrica.

### 4. O que o relógio mede e hoje não mostramos

Frequência respiratória, VO2 máx, temperatura central, treinos — cada um com o
seu número e a sua série.

## As regras que atravessam a tela

1. **Nada de faixa de referência.** Já tirámos o semáforo de HRV, FC e SpO2 na
   T-2. Vale para tudo o que entrar aqui: mostramos o medido e o medido antes.
2. **Buraco é buraco.** Vale para a hora e para o dia.
3. **A fonte é dita.** "Segundo o seu ScanWatch 2" — o aparelho mediu, não nós.
4. **Nenhuma palavra de diagnóstico.** Nem "normal", nem "alterado", nem
   "preocupante".
5. **EN e PT**, inglês primeiro.

## O que não fazer

**Não copiar o app da Withings.** O que se aproveita é o que eles descobriram
sobre ordem e granularidade; o que não se aproveita é a camada de pontuação e
conselho — eles podem dizer "a sua noite foi 72 de 100"; nós, não.

**Não pôr 1440 pontos num gráfico de telemóvel.** Agregar por minuto é o dado;
desenhar por minuto é ilegível e lento. A tela agrega, e diz que agregou.

## Critérios de aceite

- [ ] O dia tem eixo de 24h, e "ainda não aconteceu" parece diferente de "não medido"
- [ ] O hipnograma mostra as fases ao longo da noite, com hora de deitar e acordar
- [ ] As métricas novas da T-7 aparecem com número e série
- [ ] Nenhuma faixa de referência, nenhum semáforo, nenhuma pontuação nossa
- [ ] A tela diz de que aparelho veio cada coisa
- [ ] EN e PT
- [ ] Abre em menos de um segundo com 90 dias carregados


---

## Implementado em 01/10/2026

| peça | o que é |
|---|---|
| `app/api/wearables/series/route.ts` | serve a série do dia, da noite e dos treinos; **agrega o intraday no servidor** e diz o tamanho do balde |
| `mobile/src/lib/dia-e-noite-calculo.ts` | as contas, sem JSX, para o jest as alcançar |
| `mobile/src/components/ODiaEANoite.tsx` | os dois desenhos |
| `mobile/app/(app)/(clinica)/wearable-data.tsx` | o dia e a noite **acima** da tendência |
| `__tests__/wearables/o-dia-e-a-noite.test.ts` | 13 testes |

### A distinção que só existe dentro do dia

O período já tinha ensinado que **buraco é buraco**. Dentro do dia aparece uma
terceira categoria: **"ainda não aconteceu"**.

Às nove da manhã, o resto do dia está vazio porque ainda não chegou. Às nove da
noite, um vazio às três da tarde é o relógio fora do pulso. **Desenhar os dois
iguais faz a pessoa procurar um defeito que não existe — ou ignorar um que
existe.** O futuro não desenha nada; a hora não medida desenha o mesmo traço
fino que a tendência usa.

### A noite

A forma, não só o total. "6h30 de sono" não distingue uma noite inteira de seis
blocos partidos, e é a diferença que a pessoa sente ao acordar.

Dois cuidados que deram teste: **acordado é uma fase** (a fase 0 conta, e um
`if (fase)` perdê-la-ia); e **deitar-se acordado e acordar no fim não são
despertares** — contá-los somaria dois a toda a gente, todas as noites, um
número que parece informação e é artefacto.

### A cópia que eu quase deixei entrar

O componente tinha a sua própria versão das contas, e o teste exercia o módulo.
Uma divergência entre os dois passaria verde. É o mesmo erro do seed dos exames,
apanhado desta vez **antes** de subir: o componente importa, não copia.

### Critérios de aceite

- [x] O dia tem eixo de 24h, e "ainda não aconteceu" parece diferente de "não medido"
- [x] O hipnograma mostra as fases ao longo da noite, com hora de deitar e acordar
- [x] Nenhuma faixa de referência, nenhum semáforo, nenhuma pontuação nossa
- [x] A tela diz a resolução em que desenha
- [x] EN e PT
- [ ] **As métricas novas da T-7 aparecem com número e série** — depende de a
      Withings devolver; ver a medição
- [ ] Abre em menos de um segundo com 90 dias carregados — falta medir
