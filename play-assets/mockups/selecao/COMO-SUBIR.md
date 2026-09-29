# O que arrastar, e em que ordem

As imagens já estão numeradas na ordem em que devem aparecer na vitrine.
Arraste a pasta inteira, ou uma a uma na ordem do nome.

## Google Play

`Store listing → Graphics`

| campo | pasta | quantas |
|---|---|---|
| App icon | `play-assets/icon-512.png` | 1 |
| Feature graphic | `play-assets/feature-1024x500.png` | 1 |
| Phone screenshots | `selecao/google-play-phone/` | 8 |
| 7-inch tablet | `selecao/google-play-tablet-7/` | 5 |
| 10-inch tablet | `selecao/google-play-tablet-10/` | 5 |

## App Store Connect

`App Store → iOS App → Previews and Screenshots`

| tamanho | pasta | quantas |
|---|---|---|
| iPhone 6.7" | `selecao/app-store-iphone-6.7/` | 8 |
| iPad Pro 12,9" | `selecao/app-store-ipad-12.9/` | 5 |

## A ordem, e por quê

1. **your-next-session** — abre mostrando que há algo marcado; é o que o app faz
2. **clinic-video-or-home** — a escolha de formato, que é o diferencial
3. **your-exercise-plan** — o programa, com vídeo por movimento
4. **your-appointments** — o histórico e o que vem
5. **message-your-clinic** — a conversa
6. **what-reaches-your-phone** *(só telefone)* — os avisos, e a promessa de não expor o tratamento
7. **material-worth-reading** *(só telefone)* — um artigo aberto
8. **everything-in-one-place** *(só telefone)* — o menu

## Por que eu não subi

O uploader do Play Console só aceita **evento confiável** — de uma pessoa
arrastando de verdade. Tentei três caminhos e os três são ignorados: abrir o
seletor de arquivo (não abre), `setInputFiles` (descartado) e evento de `drop`
sintético (disparei em 26 elementos, nada aconteceu). É proteção contra
automação, não defeito. São poucos arrastar-e-soltar.

## O que ficou de fora, e não por acaso

`quem tem acesso`, `documentos` e a **lista** de artigos: são telas curtas, e num
quadro de tablet sobra vazio embaixo — o app não tem layout de tela grande.
Estão em `mockups/google-play-phone/` e nas outras pastas completas, se você
quiser usar alguma mesmo assim.

Vale dizer que "quem tem acesso" é o diferencial mais forte do produto em
privacidade. Se um dia houver layout de tablet, ela merece entrar na vitrine.
