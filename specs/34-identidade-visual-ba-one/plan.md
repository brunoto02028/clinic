# Atividade 34 — Unificação da identidade visual (BA One Design System v4)

**Status:** concluído

## Origem
Auditoria do Everfit (`docs/everfit-audit-2026-09-12.md`) encontrou 5 paletas de cor divergentes no sistema. O Bruno confirmou a identidade oficial: **BA One Design System v4** (mockup completo em `C:\Users\bruno\Desktop\BA_One_Screens.html`, arquivado em memória como `identidade-visual-ba-one`). Nosso `clinic` é o pilar **Health** dentro do BA One — cor de destaque moss `#4F7361`.

## O que já existe (não é do zero)

Investigando o código, parte do trabalho **já foi feito antes**, só não chegou no shell do admin:

- **`app/globals.css`, scope `.public-site`** (site público + `/dashboard/**` do paciente): já é uma implementação completa e deliberada do BA1 v4 — bone/ink/moss/greige, com comentário explícito `"DESIGN SYSTEM v4"` e uma nota importante: **"Admin stays dark"** — ou seja, a decisão de manter o admin num tema escuro (não claro como o site público) já foi tomada antes. Esta atividade respeita isso.
- **`app/globals.css`, scope `.brand-accent`** (telas de email marketing): já usa moss como `--primary`.
- **`tailwind.config.ts`**: já tem um objeto `ba1` com os hex exatos do mockup (ink/bone/card/line/muted/greige/health/ok/warn/bad) — usado hoje só em páginas de venda do livro (`beyond-pain/*`, `start-landing`, `book-roadmap`), não no admin.
- **O que diverge**: `app/globals.css :root` (tema do shell do admin inteiro) é um "Futuristic Neon Dark Theme" ad hoc (azul-teal + cores neon), sem relação com o BA1. `tailwind.config.ts` também tem `bruno.*` (slate/turquoise, usado em 7 componentes: patient detail, scans, evidence report, foot-scan, admin-login-form) e `clinic.*` (CSS vars com fallback slate/turquoise, usado só em `app/clinics/[slug]/client.tsx`) — paletas paralelas, desconectadas do BA1.

## Objetivo
Levar o shell do **admin** (hoje azul-teal neon) para os tokens do BA1 — **mantendo o admin escuro** (não copiar o tema claro do site público) — e resolver as duas paletas paralelas (`bruno.*`, `clinic.*`) sem quebrar os 7+1 componentes que já as usam. Trocar os defaults de cor de marca (novas clínicas, branding do Stripe) para moss. Aplicar também o fix pontual já identificado do logo clara no sidebar.

**Fora do escopo**: redesenho de layout ou componentes — só tokens de cor. Não mexe no `.public-site` nem no `.brand-accent` (já corretos). Não remove a capacidade de uma clínica/personal customizar sua própria marca via `Clinic.primaryColor`/`secondaryColor` — só muda o **default**.

## Decisões de design

1. **Admin continua escuro.** Em vez de inventar uma paleta clara nova pro admin, a `:root` (escopo do shell admin) troca o azul-teal por uma versão escura do BA1: fundo próximo do `ink` (#20242D), texto próximo do `bone`, `--primary`/`--accent` em moss (#4F7361). Precisa converter os hex do mockup pra HSL (convenção já usada em `globals.css`).
2. **`bruno.*` (Tailwind) vira alias, não é removido.** Os 7 componentes que usam `bruno.slate`/`bruno.turquoise` continuam funcionando sem editar cada um — só os valores hex de `bruno.slate`→ink/moss escuro e `bruno.turquoise`→moss são trocados no `tailwind.config.ts`, então a mudança se propaga sozinha.
3. **`clinic.*` (CSS vars com fallback)**: os fallbacks (`var(--clinic-primary, #607d7d)` etc.) trocam pra moss. O único consumidor hoje (`app/clinics/[slug]/client.tsx`) já injeta `--clinic-primary` a partir de `Clinic.primaryColor` do tenant — isso não muda; só o que aparece quando um tenant **não** tem cor customizada.
4. **`Clinic.primaryColor`/`secondaryColor` — só o default muda.** Migração de dados: **não** vou re-escrever a cor de clínicas que já têm um valor customizado (mesmo que seja o valor antigo `#607d7d`/`#5dc9c0`, presumo que pode ter sido escolhido de propósito por alguém) — só o **default do schema** (`@default("#607d7d")` → moss) passa a valer pra clínicas **novas** daqui pra frente. Ver Suposição abaixo — isso é uma decisão que quero confirmar.
5. **Branding do Stripe**: o fallback hardcoded em `app/api/admin/stripe-branding/route.ts` (`#5dc9c0`/`#1a6b6b`) muda pra moss/uma variante mais escura de moss — só o fallback, não sobrescreve conta que já tem cor configurada no Stripe.
6. **Logo clara**: `components/admin/admin-mini-sidebar.tsx` passa `variant="dark"` no `<Logo>` (mesmo padrão já usado em `admin-login-form.tsx`/`site-footer.tsx`). Isso só funciona de verdade se existir uma logo branca cadastrada em `SiteSettings.darkLogoUrl` (Configurações do admin) — se não existir, cai no fallback de texto "BPR". **Preciso que o Bruno confirme se já tem um arquivo de logo branca pra eu subir, ou se cadastra depois pela tela de Configurações.**

## Suposições (validar antes de eu começar a implementar)

- **Clínicas existentes mantêm a cor que já têm** (mesmo que seja o valor antigo default) — só clínicas novas nascem com moss. Se o Bruno quiser forçar TODAS as clínicas que nunca customizaram (ainda no valor default antigo) pra moss, é uma tarefa extra de migração de dados — perguntar explicitamente antes, já que mexe em dado de tenant.
- **Não tenho o arquivo da logo branca** — vou pedir pro Bruno subir pela tela de Configurações (ou me passar o arquivo) depois que o código estiver pronto; o código sozinho não resolve isso.
- **Tema do admin continua escuro** (não viro pro claro do site público) — se o Bruno preferir admin claro também, é uma decisão diferente, avisar antes.
- Não mexo em `.public-site`/`.brand-accent` (já corretos) nem nas páginas do livro que já usam `ba1.*` diretamente (já corretas).

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | Logo clara no sidebar admin | concluído |
| T-2 | Retint do tema escuro do admin (`:root`) pro BA1 | concluído |
| T-3 | Unificar `bruno.*`/`clinic.*` (Tailwind) com o BA1 | concluído |
| T-4 | Defaults de `Clinic.primaryColor`/`secondaryColor` + branding do Stripe | concluído |
| T-5 | QA visual + regressão consolidada | concluído |

## Referências
- `C:\Users\bruno\Desktop\BA_One_Screens.html` (mockup fonte da verdade)
- `app/globals.css` (linhas 9-56 `:root` atual; 309-313 `.brand-accent`; 322+ `.public-site`)
- `tailwind.config.ts` (linhas 64-96: `bruno`/`clinic`/`ba1`)
- `components/admin/admin-mini-sidebar.tsx`, `components/ui/logo.tsx`
- `app/api/admin/stripe-branding/route.ts`
- `app/clinics/[slug]/client.tsx`, `prisma/schema.prisma` (`Clinic.primaryColor`/`secondaryColor`)
