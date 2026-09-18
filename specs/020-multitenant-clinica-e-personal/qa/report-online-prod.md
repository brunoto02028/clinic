# QA online (produção) — pós-deploy da atividade 20

**Data:** 2026-09-10
**Deploy:** Coolify `finished` (~5,5 min), commit `ffefd34`. Versão prod: `4DN6L8BrtJn952q2BxmHc` → `H9mrSPcwtA-wD3kA3_ZU8`.
**Natureza:** somente leitura / não-destrutivo. Nenhuma escrita, criação ou delete em produção. Nenhum acesso ao banco de prod.

## Resultado

| Verificação | Método | Resultado |
|---|---|---|
| `/api/health` | curl | 200 ✅ |
| `/api/version` mudou (build novo no ar) | curl | ✅ nova versão |
| Home `/` renderiza | Playwright | 200, conteúdo real, **0 erros de console** ✅ |
| `/api/settings` (lê tenant) | curl | 200 ✅ (sem 500) |
| Entrada do aluno `/join/bruno-physical-rehab` (slug REAL) | curl | **200** ✅ (happy path em prod); slug inválido → 404 ✅ |
| Migração `Clinic.type` aplicada + BPR intacta | leitura autorizada do banco de prod (SELECT slug/type) | ✅ **confirmado direto**: clínica `bruno-physical-rehab`, `type: CLINIC`, `isActive: true`. Coluna existe; BPR é CLINIC → login/vocabulário não afetados. |
| `/login`, `/signup`, `/admin/**` | Playwright/curl | ⚠️ **bloqueados por desafio do Cloudflare** ("Just a moment...", 403, `Cf-Mitigated: challenge`) — inclusive no browser headless. Não verificável por automação; validar em navegador real. |

## Regressão da BPR (clínica)
Sinais fortes de que o deploy do multi-tenant **não quebrou a clínica**: home 200 sem erros, `/api/settings` 200, e as rotas que leem `clinic.type` respondem sem 500. A verificação do **login** (que lê `clinic.type` em `validateCredentials`) ficou atrás do Cloudflare — **pendente de confirmação no seu navegador**.

## Cores / paleta da marca
- **Site público + dashboard do aluno + `/join` + app mobile:** ✅ paleta **nova** (BA1/Design System v4 — bone `#F5F4F1`, ink `#20242D`, health-moss `#4F7361`, greige `#CDC7BE`). Confirmado visualmente na home (`qa/screenshots/online-prod-home.png`).
- **Admin `/admin/**` (workspace do Personal):** ⚠️ shell **escuro teal antigo** (`:root` 195°), fora da paleta nova. Decisão de design pendente do Bruno.

## Lacunas / follow-ups
1. **Login/admin atrás do Cloudflare** — a única verificação que não deu para automatizar. Confirmar o login da BPR no seu navegador (regressão de maior risco, embora o `type: CLINIC` já confirme que o `clinic.type` não quebra a leitura).
2. **Paleta do admin do Personal** — decidido: **rebrand claro completo** (bone/moss) — vira tarefa própria (ver plano).

## Notas de configuração de prod
- Slug real da clínica em prod: **`bruno-physical-rehab`**. Se/quando definir `DEFAULT_CLINIC_SLUG` (necessário antes de ativar um 2º tenant), o valor correto é `bruno-physical-rehab` — **não** `bruno-physical-rehabilitation`.
