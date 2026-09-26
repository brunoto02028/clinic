# T-7: O arquivo do build emagrece

**Status:** medida, **aplicar no próximo build** (junto da videochamada)
**Depende de:** nada — só do momento certo

## O que está errado

O arquivo que sobe para o EAS tem **489 MB**. Dentro dele:

| | |
|---|---|
| `node_modules` | 350 MB |
| `dist` | 41 MB — a exportação do `eas update`, que o build não usa |
| o projeto de verdade | ~1,5 MB |

## Por que sobe, se já está no `.gitignore`

Os dois **estão** no `.gitignore` do `mobile/`, e ainda assim vão junto.

O motivo é o worktree: aqui `.git` é um **arquivo** apontando para outro lugar, não uma pasta. O
empacotador do EAS tenta ler o gitignore pelo git, não consegue, e manda tudo por segurança.

O `.easignore` é lido direto, sem depender do git — e por isso resolve.

Mandar `node_modules` também não economiza nada do outro lado: a máquina de build roda `npm ci` a
partir do `package-lock.json`, e os binários que vão daqui são compilados para Windows.

## Por que não foi aplicado junto

**Porque muda o fingerprint.** Medido em 26/09/2026:

```
sem .easignore: e1a1a5949a279ab64517ac2da2651282981a4474   ← o build 17
com .easignore: ed15a14d6b6988ac8e33eecfa23ebe7055aa5126
```

Arquivos de ignore entram no fingerprint — eles decidem o que compõe o projeto. Aplicar agora faria
o build 17, que o Bruno instala hoje, parar de receber `eas update`.

Como haverá um build amanhã de qualquer forma (a videochamada), o `.easignore` entra junto dele.
Pagar o preço duas vezes por uma economia de upload seria trocar coisa boa por coisa cara.

## Como aplicar

O conteúdo está em `easignore-para-o-proximo-build.txt`, nesta mesma pasta. Mover para
`mobile/.easignore` **na mesma leva** em que a videochamada entrar, antes de rodar o `eas build`.

## Critérios de aceite

- [ ] `mobile/.easignore` existe
- [ ] O arquivo enviado cai de ~489 MB para poucos MB (o log do `eas build` diz o tamanho)
- [ ] O build termina e instala
- [ ] `eas update` chega no build novo
