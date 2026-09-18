# T-4: C5 — Barra fixa de ação no mobile

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Manter o CTA primário acessível no mobile: barra fixa no rodapé que aparece ao rolar além do hero.

## Arquivos afetados
- `components/mobile-cta-bar.tsx` (novo)
- `components/landing-page.tsx` (render)
- `components/whatsapp-button.tsx` (levantar o FAB na home mobile pra não sobrepor)

## Critérios de aceite
- [x] `sm:hidden`; aparece com `scrollY > 500`; botão "Começar"/"Start Your Programme" → /signup.
- [x] Não sobrepõe o WhatsApp flutuante (FAB `bottom-24 sm:bottom-6` na home).
- [x] Bilíngue EN/PT.
