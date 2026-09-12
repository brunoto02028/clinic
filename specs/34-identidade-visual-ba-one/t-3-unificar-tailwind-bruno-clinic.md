# T-3: Unificar `bruno.*`/`clinic.*` (Tailwind) com o BA1

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Fazer os 7 componentes que já usam `bruno.slate`/`bruno.turquoise`, e o componente que usa `clinic.*`, herdarem a paleta BA1 automaticamente — sem editar cada um.

## Contexto
Ver plan.md, decisões 2 e 3. `bruno.*` é usado hoje em: `app/admin/patients/[id]/page.tsx`, `app/admin/scans/page.tsx`, `components/patients/patient-detail.tsx`, `components/admin/evidence-report-tab.tsx`, `components/foot-scan/foot-scan-viewer.tsx`, `components/foot-scan/camera-capture.tsx`, `components/auth/admin-login-form.tsx`. `clinic.*` (CSS vars) é usado só em `app/clinics/[slug]/client.tsx`.

## Passos
1. Em `tailwind.config.ts`, trocar os valores hex de `bruno.*` (mantendo as mesmas chaves, pra não quebrar nenhum dos 7 componentes):
   - `bruno.slate` → `#4F7361` (moss) ou uma variante escura de ink, dependendo de como cada uso visual pedir (checar os 7 componentes durante QA — se algum usa `slate` como cor neutra/estrutural em vez de "cor de marca", considerar mapear pra um cinza do BA1 em vez de moss).
   - `bruno.turquoise` → `#4F7361` (moss) — era a cor de destaque/ação, moss assume esse papel.
   - Ajustar `slate-dark`/`slate-light`/`turquoise-dark`/`turquoise-light` proporcionalmente (tons mais escuro/claro do moss).
2. Em `tailwind.config.ts`, trocar os fallbacks de `clinic.*`: `var(--clinic-primary, #607d7d)` → `var(--clinic-primary, #4F7361)`, mesma coisa pra `secondary`/`-light`/`-dark`.
3. Passar visualmente pelos 7 componentes + `app/clinics/[slug]/client.tsx` conferindo que a troca de hex não quebrou nenhum contraste/legibilidade (ex.: um botão que dependia do turquoise ser mais claro que o fundo).

## Arquivos afetados
- `tailwind.config.ts`

## Critérios de aceite
- [ ] Os 7 componentes existentes continuam funcionando sem edição individual, agora com cores do BA1.
- [ ] `app/clinics/[slug]/client.tsx` — tenant sem `primaryColor` customizado mostra moss; tenant com cor customizada continua mostrando a cor dele (fallback não sobrescreve).
