# QA Report — T-2, T-3, T-4: Gate de permissão pro Instagram Import

**Data:** 2026-09-12
**Cenários cobertos:** #4–#12 da `qa-spec.md` (T-1/1-3 e T-5/13 cobertos separadamente)
**Resultado geral:** ✅ aprovado (bug de toast encontrado e corrigido — ver addendum)

## Ambiente
- Dev server: `npm run dev` (porta 4000).
- Dados: `scripts/qa/tenant-fixtures.cjs` (idempotente).
- SUPERADMIN de QA: **`qa.superadmin@example.test`** / `QaTenant#2026`.
- Personal trainer: `qa.trainer@example.test` / `QaTenant#2026` (tenant "QA Studio PT", `type: PERSONAL_TRAINER`).
- Clínica: `qa.admina@example.test` / `QaTenant#2026` (tenant "QA Clinic A", `type: CLINIC`).
- Estado inicial do banco (T-1 já migrado): `qa-clinic-a.instagramImportEnabled = true`, `qa-studio-pt.instagramImportEnabled = false`.
- Todos os testes de UI usaram `browser.newContext()` novo + `Network.setCacheDisabled` via CDP.
- Ambiente deixado limpo ao final: `qa-studio-pt.instagramImportEnabled = false`.

## Achado de metodologia (não é bug do produto)
A primeira tentativa de um dos cenários, feita numa aba MCP do Playwright reaproveitada de sessões anteriores, mostrou o botão "Instagram" mesmo com o flag desligado — sintoma do chunk stale do Next dev-mode já documentado em `bug-cache-playwright-nextjs-dev.md` (memória do projeto). Repetindo em `browser.newContext()` novo, o comportamento correto apareceu. Reforça a prática de sempre testar em contexto novo.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 4 | API — 403 sem o flag (trainer, flag off) | API | ✅ |
| 5 | API — sucesso com o flag | API | ✅ |
| 6 | Sessão — flag exposto | API | ✅ |
| 7 | UI — botão ausente sem o flag | UI | ✅ |
| 8 | UI — botão presente com o flag (após toggle + relogin) | UI | ✅ |
| 9 | UI — clínica principal inalterada | UI | ✅ |
| 10 | UI — SUPERADMIN liga o toggle | UI | ✅ (após fix do toast) |
| 11 | UI — SUPERADMIN desliga o toggle | UI | ✅ (após fix do toast) |
| 12 | Auth — não-SUPERADMIN sem acesso | API/UI | ✅ (sem regressão) |

## Detalhes

**4. API — 403 sem o flag ✅** — `qa.trainer@example.test` (flag `false`). `POST /api/admin/exercises/instagram` com `{"urls":["https://www.instagram.com/reel/teste123/"]}` → `403 {"error":"Instagram import isn't enabled for this clinic. Ask the platform administrator to turn it on."}`

**5. API — sucesso com o flag ✅** — `qa.admina@example.test` (flag `true`), mesma request com URL fictícia → `200`, gate liberado (não é 403); falha é do scraper (URL fake), esperado.

**6. Sessão — flag exposto ✅** — `/api/auth/session`: trainer `instagramImportEnabled: false`, admina `instagramImportEnabled: true`. Bate com o banco.

**7. UI — botão ausente sem o flag ✅** — contexto novo, `qa.trainer@example.test` → `/admin/exercises`: botão ausente. Screenshot: `t-3-trainer-no-instagram-fresh.png`.

**8. UI — botão presente com o flag ✅** — depois do toggle, relogin `qa.trainer@example.test`: botão presente, diálogo abre normalmente. Screenshots: `t-3-trainer-instagram-appears-after-toggle.png`, `t-3-trainer-instagram-dialog-open.png`.

**9. UI — clínica principal inalterada ✅** — `qa.admina@example.test`, sem ação manual: botão presente. Screenshots: `t-3-clinica-admina-instagram-presente.png`, `t-3-clinica-admina-instagram-dialog.png`.

**10/11. UI — SUPERADMIN liga/desliga o toggle ✅** — `/admin/clinics` → "QA Studio PT" → menu ⋮ → "Clinic Settings" → toggle "Instagram Import" (descrição + aviso de copyright) → ligar/desligar → Save. `PATCH /api/admin/clinics/{id}` → `200`, valor persiste no banco e reflete ao reabrir o diálogo. Confirmado com evidência de re-verificação (`t4-toast-fixed.png`, `toastVisible: 2` — texto "Clinic settings saved" apareceu na tela).

**12. Auth — não-SUPERADMIN sem acesso ✅** — `qa.trainer@example.test` (role `ADMIN`) em `/admin/clinics`: `GET /api/admin/clinics` retorna `401`; `PATCH` direto na API também `401`. Comportamento pré-existente, sem regressão.

## Erros de console
Nenhum erro de console JS em nenhum fluxo testado, em contexto de browser novo.

## Addendum — bug encontrado e corrigido

**Bug:** o diálogo "Clinic Settings" (e, na verdade, TODA a página `/admin/clinics`) usava `toast` importado de `"sonner"`, mas o único `<Toaster />` montado no app (`app/layout.tsx`) é o do shadcn (`@/components/ui/toaster`, baseado no hook `useToast()`) — sem nenhuma relação com a lib `sonner`. Toda chamada a `toast.success()`/`toast.error()`/`toast.warning()` de `"sonner"` nessa página era um no-op visual: o dado salvava certo (PATCH 200, persistência confirmada), mas nenhuma notificação aparecia — violando o critério de aceite explícito da T-4 ("toast de sucesso").

**Não era uma regressão introduzida pela T-4** — o padrão quebrado já existia nas outras 11 chamadas de `toast` da mesma página (criar clínica, copiar link, trocar de contexto, carregar lista), a T-4 só herdou.

**Correção aplicada:** trocado `import { toast } from "sonner"` por `import { useToast } from "@/hooks/use-toast"` + `const { toast } = useToast();`, e convertidas todas as 12 chamadas da página (não só as da T-4) para o formato `toast({ title, description, variant })` do hook conectado. Reverificado via Playwright (contexto novo): o texto "Clinic settings saved" agora aparece na tela depois de salvar (`t4-toast-fixed.png`).

**Fora do escopo, não corrigido:** `app/forgot-password/page.tsx` e `app/reset-password/page.tsx` têm o mesmo padrão quebrado (`toast` de `"sonner"`, sem Toaster correspondente montado) — reportado, não corrigido, por não fazer parte desta atividade.

---

## Addendum 2 — revisão de código (após este QA)

A revisão de código sobre o diff completo (T-1–T-4) encontrou mais 6 problemas, todos corrigidos e reverificados:

1. **Bypass de segurança real** — quando `session.user.clinicId` era `null` (o caso normal de um SUPERADMIN, sem clínica fixa), o endpoint caía num fallback pré-existente (`prisma.clinic.findFirst()`) que pegava uma clínica **arbitrária** e checava o flag *dela* — um SUPERADMIN podia acabar autorizado (ou um exercício importado) numa clínica completamente errada. **Corrigido:** o fallback agora usa o cookie `selected-clinic-id` (o mesmo que `/admin/clinics` → "Manage this Clinic" já usa pra dizer em qual tenant o SUPERADMIN está atuando); sem clinicId nem cookie, é 400, nunca mais uma clínica aleatória. **Reverificado ao vivo:** SUPERADMIN sem contexto → `400 "No clinic context"`; trocando o contexto pra "QA Studio PT" (flag off) → `403`; trocando pra "QA Clinic A" (flag on) → `200` — cada troca de contexto resolve exatamente a clínica certa.
2. **Migração de boot religava um flag que o SUPERADMIN tinha desligado de propósito** — o script rodava em todo restart e reativava qualquer clínica `CLINIC` ainda em `false`, sem distinguir "nunca migrado" de "SUPERADMIN desligou por decisão". **Corrigido:** o script agora roda de verdade só uma vez, controlado por um marcador em `SystemConfig` (tabela genérica de config já existente no projeto) — a partir da primeira execução, o toggle em `/admin/clinics` é a única fonte de verdade. **Reverificado:** simulei um SUPERADMIN desligando uma clínica `CLINIC` e rodei o script de novo — ficou desligada (antes da correção, teria voltado pra `true`).
3. **Ordem no `start.sh`** — o script rodava depois de 7 outras tarefas de boot, ampliando a janela (o servidor já está servindo tráfego antes de terminar as tarefas de manutenção, por design documentado no próprio arquivo) em que uma clínica `CLINIC` levaria 403 num recurso que já funcionava segundos antes. **Mitigado (não eliminado — a arquitetura de "servidor sobe primeiro" é intencional):** movido pra logo depois do bootstrap da clínica, antes das tarefas de conteúdo menos críticas.
4. **`toast.warning` sem variante correspondente** — o componente de toast só tinha `default`/`destructive`/`success`; o aviso de "conta do dono falhou, adicione manualmente" caía no `default` sem cor nenhuma, fácil de passar batido justamente no caso que mais precisa de atenção. **Corrigido:** adicionada uma variante `warning` (âmbar) no componente `components/ui/toast.tsx`, usada nesse caso.
5. **Cadastro de paciente via mobile hardcoded `instagramImportEnabled: false`** (e também `clinicLogoUrl`/`clinicPrimaryColor`, gap pré-existente) em vez de vir do tenant real. **Corrigido:** `lib/join-tenant.ts` agora seleciona e devolve esses três campos do `Clinic` de verdade; o registro mobile usa o valor real. Impacto prático baixo (paciente nunca usa esse campo), mas evita o dado ficar incoerente com o banco.
6. **Flash do botão "Instagram" no primeiro render** — `useSession()` retorna `undefined` no primeiro render antes de resolver, então o botão pisca ausente→presente em clínicas com o flag ligado. Avaliado como cosmético/baixo impacto (mesmo padrão de qualquer UI condicionada à sessão nesse app) — não corrigido, registrado como limitação conhecida.

---

**Resultado geral: 9/9 cenários de QA aprovados + 6/6 achados da revisão de código corrigidos e reverificados (5 corrigidos, 1 registrado como limitação conhecida de baixo impacto).**
