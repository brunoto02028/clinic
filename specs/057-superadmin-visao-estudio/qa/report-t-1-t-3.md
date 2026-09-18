# QA — Atividade 57, T-1 a T-3 (superadmin vê o estúdio como o personal)

- **Data:** 18/09/2026
- **Código:** working tree não commitado da branch `brunoto02028/Personal`:
  - `lib/auth-options.ts`
  - `app/admin/layout.tsx`
  - `components/admin/tenant-view-banner.tsx` (novo)
  - inclui a correção do code review: a seleção é resolvida pelo `resolveActorTenant`.
- **Ambiente:** Next dev em :4002 (`OUTBOUND_MODE=sink`), banco local com fixtures. UI no Playwright com cookies limpos a cada usuário e cache desligado; API por curl.
- **Executado por:** agente qa-tester, mais a sessão principal (teste do tenant inativo e ajuste da faixa a 390 px).

| Tarefa | Veredito |
|---|---|
| T-1 Sessão segue o tenant selecionado | **APROVADO** |
| T-2 Faixa "Viewing … · Back to BPR" | **APROVADO** (O-4 corrigida) |
| T-3 Regressão e "View as Student" | **APROVADO** (O-2 para decisão do Bruno) |

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1.1 | Superadmin sem seleção | API+UI | ✅ igual a antes (a fixture não tem tenant próprio: título "Admin", menu de clínica) |
| 1.1b | Superadmin **com tenant próprio**, BPR (temporário) | API | ✅ sem seleção ou com a BPR: "Bruno Physical Rehabilitation"/CLINIC, sem faixa |
| 1.2a/b | "Manage this Clinic" e seletor da sidebar → `qa-studio-pt` | UI+API | ✅ `PERSONAL_TRAINER` "QA Studio PT", título "QA Studio PT · Admin"; `clinicId` e `role` inalterados |
| 1.2c | Lado a lado com o `/admin` do `qa.trainer` | UI | ✅ mesmos h2/h3 ("Studio" com halteres, "Trainers", "Your studio links", "Getting started") e mesmo menu; 0 estetoscópios. Única diferença: as Quick Actions (O-2) |
| 1.3 | training-programs / nutrition / challenges no estúdio | UI+API | ✅ 200. Com clínica ou a BPR selecionada, 307 → `/admin` |
| 1.4 | Seletor → QA Clinic A | UI+API | ✅ CLINIC "QA Clinic A · Admin", estetoscópio, faixa |
| 1.5 | Cookie com id inexistente | API | ✅ sem erro; volta para o próprio tenant |
| 1.5c | Tenant selecionado **inativo** (sessão principal, depois do review) | API | ✅ a tela não mostra o estúdio inativo, na mesma regra do `getActor` (ver alerta no plan.md sobre o `x-clinic-id` legado) |
| 1.5b | `useSession().update()` | API | ✅ mantém a visão correta |
| 1.6 | trainer / aluno / admina / pacientea | API | ✅ campos iguais aos do banco, sem `viewClinicId`. Cookie injetado não muda nada |
| 2.1 | Faixa EN e PT | UI | ✅ "Viewing **QA Studio PT** as platform admin · Back to BPR" / "Você está vendo **QA Studio PT** como admin da plataforma · Voltar para a BPR" |
| 2.2 | "Back to BPR" | UI+API | ✅ seleção limpa, `/admin` na visão própria, sem faixa |
| 2.3 | trainer / admina | UI+API | ✅ sem faixa, mesmo com cookie injetado |
| 2.4 | 390 px | UI | ✅ sem rolagem. Texto espremido em PT (O-4), corrigido: texto em 2 linhas e botão embaixo (`t-2-faixa-pt-390-ajustada.png`) |
| 3.1 | Superadmin no estúdio → "View as Student" do `qa.aluno` | UI | ✅ aba "QA Studio PT", menu **idêntico** ao do próprio aluno, sem item clínico; "Voltar ao Admin" limpa os 4 cookies |
| 3.2 | trainer, admina, aluno, pacientea (3 telas cada) | UI | ✅ títulos e menus estáveis |
| 3.3 | BPR → estúdio → clínica → estúdio → BPR | UI | ✅ o estado final é idêntico ao inicial |

## Evidências principais
```
1.2  session → clinicId:null, clinicName:"QA Studio PT", clinicType:"PERSONAL_TRAINER",
               viewClinicId:"cmu6aoc2p0001xz8op9upjd7y", role:"SUPERADMIN"
     /admin trainer   h2: [Today at a Glance, Studio, Students, Administration]  dumbbell=3 stetho=0
     /admin superadm. h2: [Today at a Glance, Studio, Students, Administration]  dumbbell=3 stetho=0
1.5c estúdio ativo → PERSONAL_TRAINER ; inativo → sem visão do estúdio ; id inválido → próprio ; voltar → como antes
1.6  trainer/aluno/admina/pacientea (normal e com cookie injetado): diffs vs banco = none ; viewClinicId ausente
3.1  impersonate → /dashboard título "QA Studio PT"; menu = menu do qa.aluno logado (14 itens iguais)
```
Screenshots em `qa/screenshots/`:
- `t-1-lado-a-lado-trainer-vs-superadmin.png`
- `t-1-superadmin-estudio-via-{manage,seletor}.png`
- `t-1-superadmin-clinica-a-via-seletor.png`
- `t-1-superadmin-estudio-{training-programs,nutrition,challenges}.png`
- `t-2-faixa-{pt-desktop,pt-390,en-390}.png`
- `t-2-faixa-pt-390-ajustada.png`
- `t-2-voltar-bpr-sem-faixa.png`
- `t-3-view-as-student-portal-estudio.png`
- `t-3-{superadmin-bpr-antes,ficha-aluno-superadmin,trainer-admin,admina-admin,aluno-dashboard,pacientea-dashboard}.png`

## Observações
- **O-1 (ambiente):** o `qa.superadmin` da fixture não tem tenant próprio. O caso real (com a BPR) foi coberto apontando o `clinicId` para a BPR local temporariamente e depois restaurando para `null`.
- **O-2 (decisão do Bruno):** vendo um estúdio, as Quick Actions do `/admin` mostram as do superadmin ("New Article", "Site Settings", "View Website") no lugar das do personal ("Studio branding"). É por papel (`app/admin/page.tsx`) e é a única diferença visual.
- **O-3:** na visão global, o superadmin não personifica aluno de estúdio (404 pela trava de tenant). É esperado.
- **O-5 (preexistente, fora do escopo):** o botão em PT diz "Novo Sessão".
- **Console:** só os 403 de `/api/admin/notifications` para o superadmin, que já existiam. Nenhum erro novo e nenhum aviso do `cookies()` no callback `jwt`.

## Limpeza
- `qa.superadmin.clinicId` restaurado para `null`.
- Seleção do superadmin: `null`.
- 0 cookies de personificação.
- Locale de volta para EN.
- Estúdio inativo de teste (`qa057-inactive`) apagado.
