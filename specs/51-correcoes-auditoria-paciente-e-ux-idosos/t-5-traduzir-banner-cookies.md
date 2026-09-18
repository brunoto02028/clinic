# T-5: Traduzir banner de cookies pro português

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
O banner de cookies respeita o idioma selecionado (`useLocale`), igual o resto do site.

## Contexto
`components/cookie-consent.tsx` é um componente próprio (não é lib de terceiros), 100%
hardcoded em inglês, sem nenhum uso de `useLocale`/`lib/i18n.ts` — apesar do projeto já ter
esse mecanismo (`hooks/use-locale.ts`, confirmado como client-side/localStorage, sem
dependência de sessão, seguro de usar num componente que aparece em páginas públicas antes do
login). Textos a traduzir: "We value your privacy" (linha 121), corpo (126), "Manage
preferences" (142), "Reject non-essential" (149), "Accept all" (155), e o painel de
preferências completo ("Cookie Preferences", "Strictly necessary", "Analytics", "Marketing",
"Reject all", "Save preferences", linhas 164-254).

## Passos
1. Adicionar as chaves novas em `lib/i18n.ts` (seção nova, ex. `cookies.*`), com os textos em
   `en-GB`/`pt-BR` pra cada string listada acima.
2. Em `components/cookie-consent.tsx`, importar `useLocale` e trocar cada string literal por
   `t("cookies.xxx")`.

## Arquivos afetados
- `lib/i18n.ts`
- `components/cookie-consent.tsx`

## Critérios de aceite
- [ ] Com o site em português, o banner (incluindo o painel "Manage preferences" expandido)
      aparece inteiro em português.
- [ ] Com o site em inglês, continua exatamente como está hoje.
- [ ] Funciona numa página pública, antes de qualquer login (ex.: home).
- [ ] `npx tsc --noEmit` e `npx next lint` limpos.
