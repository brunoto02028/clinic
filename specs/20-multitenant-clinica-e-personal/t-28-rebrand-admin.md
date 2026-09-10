# T-28: Rebrand claro do admin (paleta da marca)

**Status:** pendente (planejar antes de implementar)
**Trilha:** PLATAFORMA
**Depende de:** —

## Objetivo
Migrar o admin (`/admin/**`) do shell escuro teal antigo para a paleta clara da marca (BA1/Design System v4: bone `#F5F4F1`, ink `#20242D`, health-moss `#4F7361`, greige `#CDC7BE`, health-soft `#EDF3EF`), já usada no site público, no dashboard do aluno e no app.

## Decisão do Bruno
- **Escopo: todo o admin, inclusive a clínica (BPR) em produção** (não só tenant personal).
- Prioridade: **depois** do produto do Personal (T-20+).

## Riscos / notas
- O admin usa **cores teal hardcoded** em vários componentes (ex.: `components/admin/admin-mini-sidebar.tsx` com `hsl(195,30%,42%)`, `hsl(174,56%,57%)`), além dos tokens em `:root`. Rebrand "completo" = converter tokens **e** varrer os valores fixos.
- Mexe no visual da clínica ao vivo → **QA de regressão pesado** + revisão antes de qualquer push.
- Provável abordagem: definir a paleta clara em tokens no escopo do shell admin (como `.public-site` faz) e substituir os `hsl(...)` fixos por `var(--token)`.

## Critérios de aceite (a detalhar no plano)
- [ ] Admin inteiro na paleta BA1, sem teal residual.
- [ ] Contraste/legibilidade preservados (texto ink sobre bone; CTAs moss/greige).
- [ ] Regressão: nenhuma tela do admin quebrada; QA com evidência antes do push.
