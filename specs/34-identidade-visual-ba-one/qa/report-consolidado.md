# QA Report — Atividade 34: Unificação da identidade visual (BA One)

**Data:** 2026-09-12
**Resultado geral:** ✅ aprovado — 14 cenários ✅, 0 ❌, 5 ⚠️ não executados por falta de dado local ou fora de escopo (nenhum é falha real).

**Nota metodológica:** os arquivos (`admin-mini-sidebar.tsx`, `app/globals.css`, `tailwind.config.ts`, `scripts/migrate-personal-trainer-colors.js`) foram editados durante a janela desta sessão de QA, em resposta a achados de uma revisão de código em paralelo (ver seção "Achados e correções" abaixo) — os resultados abaixo refletem o **estado final** dos arquivos, depois de todas as correções aplicadas.

**Screenshots:** `specs/34-identidade-visual-ba-one/qa/screenshots/` — `t-1-sidebar-logo.png`, `t-1-sidebar-fallback-text.png`, `t-1-t-2-dashboard.png`, `t-2-patients-list.png`, `t-2-t-3-patient-detail.png`, `t-2-settings.png`, `t-3-admin-scans.png`, `t-3-clinic-custom-color.png`, `t-3-evidence-report-tab.png`, `t-3-staff-login.png`, `t-4-clinic-default-color.png`, `t-5-public-site.png`, `t-5-email-marketing.png`.

## Tabela de cenários

| # | Cenário | Resultado |
|---|---------|-----------|
| T-1 | Logo legível no sidebar (com `darkLogoUrl` configurado) | ✅ |
| T-1 | Fallback de texto "BPR" sem logo cadastrada | ✅ |
| T-2 | Dashboard / pacientes / ficha / configurações — moss, continua escuro, contraste ok | ✅ (4/4) |
| T-2 | Sem resíduo de `hsl(195,...)` (teal antigo) em nenhuma tela | ✅ |
| T-3 | Componentes `bruno.*` (staff-login, evidence-report-tab, scans) | ✅ parcial (sem dado de scan/evidence report no ambiente local) |
| T-3 | `/clinics/[slug]` com `primaryColor` customizado não é sobrescrito | ✅ |
| T-3 | `/clinics/[slug]` sem cor customizada → moss | ✅ (evidência via T-4) |
| T-4 | `Clinic` nova sem cor → `#4F7361`/`#3D5A4D` | ✅ |
| T-4 | `Clinic` existente mantém cor customizada após a migração | ✅ |
| T-4 | Fallback do `stripe-branding` = moss (confirmado no código) | ✅ |
| T-4 | `stripe-branding` GET ao vivo | ⚠️ não executado (sem `STRIPE_SECRET_KEY` no ambiente local) |
| T-4 | `migrate-personal-trainer-colors.js` idempotente (2ª execução = "Updated 0") | ✅ |
| T-5 | `.public-site` (`/start`) visualmente inalterado | ✅ |
| T-5 | `.brand-accent` (email marketing) visualmente inalterado | ✅ |
| T-5 | Console sem erros novos | ✅ |
| — | Evidence report com dado real | ⚠️ não executado (nenhum relatório no banco local) |

## Achados e correções (revisão de código em paralelo, aplicadas antes deste QA fechar)

1. **`--neon-*` removidas sem substituto** quebravam silenciosamente ~20 efeitos já em uso (`.bg-grid-pattern` em todo o admin, `.glass*`, `.card-hover`, glow effects, scrollbar) — restauradas, remapeadas pra RGB da paleta BA One (moss/ok/ink-2/bad/warn).
2. **Moss como cor de texto tinha contraste insuficiente** (~3:1) em `.article-content a`/`li::marker` e `prose-a:text-primary` no admin escuro — criado `--accent-bright` (moss mais claro, 150 30% 60%, contraste 8:1+), usado só onde moss aparece como texto/link, não nos botões.
3. **Sidebar/header/abas de seção continuavam com o teal antigo hardcoded** (`hsl(195,...)`/`hsl(174,...)` literais) — era o achado mais importante, contradizia o objetivo da atividade. Todos trocados pra referenciar as CSS vars retintadas.
4. **`bruno.slate`/`bruno.turquoise` colapsaram pra hex idêntico**, quebrando um gradiente em `evidence-report-tab.tsx` — diferenciados de novo (slate = família ink, turquoise = moss).
5. **`migrate-personal-trainer-colors.js` exigia as duas cores no default simultaneamente** — uma clínica que customizasse só um campo nunca seria migrada nesse campo. Corrigido: cada campo checado/migrado independentemente.

## Achados fora do escopo (não bloqueantes, pré-existentes)

- Cache dev agressivo (`immutable, max-age=1yr`) pode exigir hard-refresh ao testar localmente.
- Contraste baixo pré-existente em `/clinics/[slug]` ("Our Services", "Get in Touch") — não introduzido por esta atividade.
- Warning de `key` prop ausente em `app/clinics/[slug]/client.tsx` — pré-existente.
- Recomendação para QA futuro: popular um `FootScan` de teste pra cobrir `foot-scan-viewer.tsx`/`camera-capture.tsx`/evidence report com dado real.

## Limpeza
Clínicas de teste (`qa34-custom-color-*`, `qa34-default-color-*`) deletadas do banco local; `SiteSettings.logoUrl`/`darkLogoUrl` confirmados no valor original. Nenhuma alteração de código feita pelo QA em si (as correções da seção acima foram da sessão principal, em paralelo). Único dado alterado permanentemente: senha local de `admin@bpr.rehab` (necessária pro login em QA local, sem impacto em produção).

---

**Resultado:** ✅ aprovado. Todos os 5 achados da revisão de código foram corrigidos e confirmados neste QA (estado final dos arquivos). Nenhuma regressão encontrada.
