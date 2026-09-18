# T-2: C2 — Prova social na home (pronta porém oculta)

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Seção de depoimentos na home, lendo a mesma fonte real do `/start` (`SiteSettings.startTestimonialsJson`). Oculta quando vazia — nunca exibir review inventado.

## Arquivos afetados
- `components/home-testimonials.tsx` (novo)
- `components/landing-page.tsx` (render + parse do JSON)

## Critérios de aceite
- [x] Renderiza até 3 depoimentos bilíngues quando houver dados.
- [x] Retorna `null` quando a lista está vazia (prod hoje = 0).
- [x] On-brand (teal `#4F7361`).
