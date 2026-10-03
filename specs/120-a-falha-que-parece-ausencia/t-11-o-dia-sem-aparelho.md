# T-11: O dia sem aparelho não é dia sem leitura

**Status:** concluído (03/10/2026)
**Depende de:** nenhuma

## O que ele viu

Na tela de trinta dias, por baixo de passos, calorias e minutos activos:

> *27 days without a reading — shown as a gap, not as zero.*

E o Bruno, no mesmo dia:

> *"Os 27 dias que mostra ali no nosso é irrelevante, porque faz dois dias que
> chegou o relógio e eu comecei a fazer as medições. O mais importante é estar
> sincronizado com o dia atual e hora atual."*

## Porque isto é pior para os pacientes do que para ele

Ele sabe o que o aviso quer dizer. Um paciente que liga o aparelho hoje abre a
tela e lê **"29 dias sem leitura"** — no primeiro dia de uso, sobre uma conta
acabada de ligar. É uma frase que se lê como avaria e descreve o normal.

No lançamento, seria a primeira coisa que toda a gente veria.

**Ausência de dado** e **ausência de aparelho** não são a mesma coisa, e só uma
delas é notícia. Esta atividade existe para a primeira; esta tarefa tira a
segunda do caminho para a primeira continuar a ser visível.

## A correção

`diasSemLeitura(pontos, desde)` conta buracos **a partir do dia em que a ligação
passou a existir**. A tela calcula `desde` da mais antiga das ligações
(`createdAt`), que já vinha na resposta das ligações — nenhum campo novo, nenhuma
chamada nova.

Sem `desde`, conta tudo: é o comportamento que havia.

Vive em `lib/tendencia-calculo.ts` e não no componente pela razão de sempre nesta
base — ver `regra-provada-na-funcao-desfeita-no-jsx`.

## O que **continua** a aparecer

Um buraco **depois** da ligação. Foi assim que a cadeia de tokens morreu durante
27 dias sem ninguém ver, e é exactamente o que não pode ser escondido junto com
o resto. O teste fixa-o: ligado a 20/09, com leitura só nos últimos dois dias →
**12 dias** contados.

## Arquivos afetados

- `mobile/src/lib/tendencia-calculo.ts` — `diasSemLeitura`
- `mobile/src/components/Tendencia.tsx` — `desde`, e a contagem sai do JSX
- `mobile/app/(app)/(clinica)/wearable-data.tsx` — `desde` dos cinco cartões
- `__tests__/wearables/o-dia-sem-aparelho-nao-e-dia-sem-leitura.test.ts`

## Critérios de aceite

- [x] Relógio ligado há dois dias → zero buracos contados
- [x] Paciente que liga hoje → zero
- [x] Silêncio **depois** da ligação → continua a contar
- [x] O dia da ligação conta como dia de aparelho
- [x] Sem saber a data da ligação, conta tudo (o que havia)
- [x] Mutação: voltar a contar tudo mata 4 testes
- [ ] Ver na app — precisa de `eas update`
