# T-3: Os textos, o crachá e o enum

**Status:** pendente
**Depende de:** T-2

## Objetivo

Tirar do código as frases que prometem medir pressão pela câmera, **sem apagar o
histórico** de quem já mediu assim.

## Contexto

`lib/i18n.ts` tem cerca de 40 chaves `bp.*` sobre PPG. Duas merecem ser citadas,
porque são o motivo de esta atividade existir:

> *"Blood pressure estimation, heart rate, cardiac rhythm analysis (arrhythmia
> detection), and HRV metrics — all from your phone camera using PPG technology."*

> *"Esta análise baseada em PPG é apenas para fins informativos. NÃO é um
> dispositivo médico…"*

A segunda é um aviso legal a proteger a primeira. Removida a primeira, a segunda
não tem o que proteger.

## O enum fica

`CAMERA_PPG` **continua** em `prisma/schema.prisma`. Há leituras gravadas com
ele, e trocar o valor delas reescreveria o que aconteceu: uma leitura medida por
câmera não vira uma leitura digitada porque o produto mudou de ideia.

O que muda é que **nenhum caminho vivo escreve mais esse valor**. O crachá
continua a saber desenhar o que está gravado — não é um botão, é um registro.

Uma migração que apaga história para deixar o código mais limpo troca uma coisa
barata por uma cara.

## Passos

1. Remover as chaves `bp.*` que só existiam para a câmera, nas duas línguas.
2. Manter o crachá a desenhar `CAMERA_PPG` no histórico.
3. Um teste: **nenhum caminho vivo escreve `CAMERA_PPG`**.
4. Uma varredura: nenhuma frase do produto oferece medir pressão por câmera.

## Arquivos afetados

- `lib/i18n.ts`
- `app/admin/patients/[id]/page.tsx`, `app/admin/blood-pressure/page.tsx`
- `mobile/src/api/blood-pressure.ts` (o tipo mantém o valor, pelo histórico)
- um teste novo

## Critérios de aceite

- [ ] Nenhuma frase do produto promete medir pressão pela câmera
- [ ] Leituras antigas continuam a aparecer, com a origem certa
- [ ] O teste cai se alguém voltar a escrever `CAMERA_PPG`
- [ ] Nenhuma migração apagou ou reescreveu leitura
