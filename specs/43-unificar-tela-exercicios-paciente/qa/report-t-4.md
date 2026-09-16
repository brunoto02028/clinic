# QA Report — T-4: Aposentar "My Exercises"

**Data:** 2026-09-16
**Resultado geral:** ✅ aprovado
**Ambiente:** Produção (https://bpr.clinic), build 2026-09-16T06:50:33.678Z

## Resumo
| # | Cenário | Resultado |
|---|---------|-----------|
| 1 | Item "Exercises" do menu lateral aponta pra `/dashboard/treatment` | ✅ |
| 2 | Acessar `/dashboard/exercises` direto → redireciona pra `/dashboard/treatment`, sem 404 | ✅ |
| 3 | Preview do admin (`/patient-preview/exercises`) não quebra | ✅ (verificado por leitura de código — reaponta pro mesmo componente de `treatment`) |

## Evidência
- `window.location.pathname` após `page.goto('https://bpr.clinic/dashboard/exercises')` retornou
  `/dashboard/treatment` — redirect confirmado, sem tela de erro/404.
- Snapshot do menu lateral (impersonando paciente de teste com protocolo) mostrou
  `link "Exercises" [ref=...]: /url: /dashboard/treatment` — o item de navegação já não aponta
  mais pra rota antiga.
- O módulo `mod_exercises` (usado pelo menu "achatado" quando o menu é despinado) tinha seu
  próprio `href: "/dashboard/exercises"` em `lib/module-registry.ts`, separado de
  `lib/patient-sections.ts` — achado nesta rodada e corrigido junto (commit `3193b16`), senão esse
  segundo lugar continuaria linkando pra rota aposentada.
- Não achei mais nenhuma referência direta a `/dashboard/exercises` como destino de clique
  restante no código do paciente (grep completo no repo); as poucas sobras (`middleware.ts`,
  `mobile-page-header.tsx`) são mapeamentos inertes que nunca são alcançados na prática (o
  primeiro é rota de staff, o segundo só resolve título depois que o redirect já trocou a URL).
