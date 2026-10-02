# T-9: A aba Saúde com a cara nova, e o que cabe num update

**Status:** concluído (02/10/2026) — QA comparativo e review pendentes
**Depende de:** T-8 (a linguagem, já aplicada ao relatório)

## O pedido

> *"ainda vou ver aquela cara do Saúde com a cara do Sonarhealth?"* — Bruno,
> 02/10/2026

E, perguntado até onde ir, escolheu **o que cabe num update OTA**: tipografia,
espaçamento, hierarquia e a tendência nos cartões. Sem build.

## A restrição que decide o desenho

**`react-native-svg` não está instalado.** Acrescentá-lo é um módulo nativo novo,
o que muda o *fingerprint* — e um fingerprint novo faz o `eas update` **deixar de
chegar aos binários já instalados**. O mesmo motivo pelo qual o traçado do ECG é
desenhado no servidor e não no telemóvel.

Então o desenho é feito com `View`s. E a restrição produz o visual mais honesto:

**Barras, não linha.** Numa série com buracos, uma barra que falta é
inequívoca — não há sequer a pergunta de atravessar ou não o dia sem dado, que
foi a decisão mais delicada do gráfico do papel. O que no relatório foi preciso
defender com uma regra, aqui é a forma.

## As decisões

### Uma barra por dia da janela, não por dia com dado

Sete barras para sete dias. Um dia sem medição é **espaço vazio na sua posição**,
e não uma barra a menos que encolhe o resto para a esquerda — isso adiantaria
todos os dias seguintes, o mesmo erro que encurtou uma gravação de ECG de 30 s
para 29.

### A altura é relativa ao próprio período, e os limites dizem-se

Como no papel: a escala começa onde os dados começam, com o mínimo e o máximo
escritos. Uma barra cheia não quer dizer "bom", quer dizer "o maior destes dias".

### Nenhuma cor que julgue

Saiu na 099 T-2 e não volta por um cartão novo. Uma barra vermelha quando sobe é
uma afirmação clínica desenhada.

### A série vem do servidor, resolvida

O app **não** repete o mapa de onde cada métrica mora. Isso foi o defeito da
119 T-9 — três leitores a escolherem o balde de memória, e a clínica inteira cega
durante semanas. `/api/wearables/data` devolve a série já resolvida pelo
`serieDaMetrica`, e o app desenha o que recebe.

## Passos

1. `/api/wearables/data`: `series` por métrica, pelo mapa que já existe.
2. `mobile/src/lib/barras-da-metrica.ts`: série → alturas e buracos. A parte
   verificável, fora da tela.
3. `mobile/src/components/BarrasDaMetrica.tsx`: as `View`s.
4. A aba: rótulo pequeno, número grande, barras, nota — a linguagem do relatório.
5. Testes com séries que o banco produz — com buracos — e mutação.

## Arquivos afetados

- `app/api/wearables/data/route.ts`
- `mobile/src/lib/barras-da-metrica.ts` (novo)
- `mobile/src/components/BarrasDaMetrica.tsx` (novo)
- `mobile/app/(app)/(clinica)/(tabs)/saude.tsx`
- `__tests__/...` (novo)

## Critérios de aceite

- [x] Cada cartão com 2+ dias de dado mostra as suas barras
- [x] **Um dia sem dado é espaço vazio na sua posição**, não uma barra a menos
- [x] O mínimo e o máximo do período aparecem
- [x] Nenhuma cor que julgue
- [x] **Nenhuma dependência nova** — `git diff` de `mobile/package.json` vazio
- [x] O app não repete o mapa de onde cada métrica mora
- [x] EN e PT (do Brasil)
