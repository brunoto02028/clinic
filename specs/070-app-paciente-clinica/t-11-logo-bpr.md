# T-11: Logo da BPR no app

**Status:** concluido (aguardando QA)
**Depende de:** T-3

## Objetivo
Usar o logo real da BPR — o mesmo arquivo que o site serve — em todos os lugares do app.

## Contexto
Pedido do Bruno em 22/09/2026, depois da T-3. Ao investigar, apareceram **dois problemas**, nenhum deles previsto no plano:

**1. O app nunca teve identidade visual.** `mobile/assets/icon.png` e `splash-icon.png` eram os **placeholders do `create-expo-app`** — o chevron azul com guias de construção e o grid com círculos. Não era "atualizar a marca": era colocar marca onde não havia nenhuma.

**2. A tela de abertura desenhava uma aproximação da marca.** `app/index.tsx` montava três `View`s verticais em `#46587A` / `#8FA98F` / `#A87438` — as cores dos pilares do BA One (work/health/community), não as do logo da BPR, que é moss. O componente `TriBar` do design system **também não é o logo**: é um indicador de progresso horizontal dos mesmos três pilares.

O logo real (`public/logo.png` e `public/logo-dark.png`, 581×674) é a marca de três barras em moss sobre o wordmark "bpr".

## O que foi feito
Assets gerados a partir do arquivo do site, sem redesenhar nada:

| Arquivo | Conteudo |
|---|---|
| `icon.png` | 1024², logo bone sobre slate `#20242D`, sem transparencia (a Apple nao aceita) |
| `splash-icon.png` | 1024², logo transparente — o `backgroundColor` do `app.json` aparece atras |
| `android-icon-foreground.png` | logo a 460px de altura: canto a 304px do centro, dentro do limite de 338 da zona segura |
| `android-icon-background.png` | slate solido |
| `android-icon-monochrome.png` | silhueta branca, para o icone tematico do Android 13+ |
| `favicon.png` | 256², logo ink sobre bone, para o alvo web |
| `logo.png` / `logo-ink.png` | o proprio arquivo do site, as duas variantes, para uso em tela |

Componente `src/components/ui/Logo.tsx`, exportado pelo barrel do design system.

**Duas variantes existem por necessidade, nao por gosto:** o `Screen` pinta `t.colors.background`, que e `palette.bone` (`#F5F4F1`), enquanto a abertura e o seletor de modulo fixam slate `#20242D` na mao. Logo bone sobre fundo bone e invisivel. O `tone` e explicito porque o tema **nao** consegue dizer o que um `View` pai hardcoded esta fazendo.

Aplicado em: `app/index.tsx` (`tone="bone"`, substituindo a marca desenhada e o texto "BPR" — o logo ja traz o wordmark), `app/login.tsx` e `app/register.tsx` (`tone="ink"`).

## Arquivos afetados
- `mobile/assets/` (7 arquivos)
- `mobile/src/components/ui/Logo.tsx` (novo)
- `mobile/src/components/ui/index.ts`
- `mobile/app/index.tsx`, `login.tsx`, `register.tsx`

## Criterios de aceite
- [x] Nenhum placeholder do Expo em `mobile/assets/`
- [x] Nenhuma marca desenhada a mao no codigo
- [x] Logo legivel nos dois fundos (bone sobre slate, ink sobre bone)
- [x] Zona segura do adaptive icon respeitada
- [x] Typecheck sem erro novo
- [ ] Verificado visualmente nas telas (QA)
- [ ] Icone e splash confirmados em build EAS

## Pendente de decisao
O logo e um lockup empilhado: marca em cima, wordmark embaixo. No splash fica otimo. No **icone em 60×60pt** a marca vira tres risquinhos e sobra o "bpr". Alternativa de marca comum: icone so com a marca de tres barras, reservando o lockup completo para o splash. **Bruno ainda nao decidiu** — hoje esta com o lockup completo.
