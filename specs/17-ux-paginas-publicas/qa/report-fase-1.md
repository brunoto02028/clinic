# QA — Fase 1 (C1, D3, C4, T1)

**Data:** 2026-08-24
**Ambiente:** dev local (`next dev`), Playwright MCP. Home renderizada e validada em desktop (1280px) e mobile (390px), nos dois idiomas.
**Resultado:** ✅ Aprovado.

> Nota: B1 (Vapi 503→200) e P1 (lazy-load em `/articles`) já foram commitados antes (4059c37). B2 é ajuste no painel Cloudflare (lado do Bruno). S1/hreflang depende de URL por idioma (spec 12) — fora do escopo desta fase.

## Itens verificados

| ID | Item | Evidência | Status |
|----|------|-----------|--------|
| C1 | Hierarquia de CTA no hero — 1 primário ("Start Your Programme") + link discreto de login ("Already a patient? Log in" → /login), removido o botão outline "Patient Portal" que competia | `qa-c1-hero.png` (desktop), `qa-c1-cta-mobile.png` (mobile) | ✅ |
| D3 | Contraste — ícone da citação `text-rose-400`→`#4F7361` (teal da marca), citação `slate-500`→`slate-600` | `qa-c1-hero.png` | ✅ |
| C4 | Bloco "Investment" — 3 cartões (Initial Assessment & Plan **from £95**; Your Treatment Programme *tailored — quoted*; Home Visits *on request*) + rodapé "Prices are indicative and confirmed at your assessment." | `qa-c4-pricing.png` (EN), `qa-c4-pricing-pt.png` (PT) | ✅ |
| T1 | FAQ na home — accordion com 5 perguntas (referral, sessões, domicílio, condições, seguro); abre/fecha | `qa-c4-pricing.png` | ✅ |

## Assertivas de DOM (porta limpa 4131)
- `Already a patient? Log in` presente, `href="/login"` ✅
- Ícone da citação com `#4F7361`, nenhum `rose-400` remanescente ✅
- `from £95` presente; bloco Investment + FAQ renderizados ✅
- Toggle **PT**: "Investimento", "a partir de £95", "Perguntas Frequentes", "Já é paciente? Entrar" ✅ / nenhum resíduo em inglês
- Accordion do FAQ abre e mostra a resposta ✅

## Observações (não bloqueadoras)
- 2 erros de console `/_next/image?url=/api/image-serve/<id>` **500** — os blobs dessas imagens só existem no DB de produção; no DB local elas não resolvem. Não têm relação com as mudanças da Fase 1 e não ocorrem em prod.

## Preços (para o Bruno confirmar)
Os valores são **estimativas indicativas** baseadas na média de fisioterapia privada no Reino Unido em 2025 (avaliação inicial ~£70–£120; posicionei £95 por ser clínica tech-enabled). Números marcados como "confirmados na avaliação" no próprio bloco. Ajuste `from £95` em `components/home-pricing-faq.tsx` se quiser outro valor.
