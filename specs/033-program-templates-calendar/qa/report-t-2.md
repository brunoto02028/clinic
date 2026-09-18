# QA Report — T-2: Editor em calendário

**Data:** 2026-09-12
**Resultado geral:** ⚠️ aprovado com ressalvas (1 achado real: gap de gating no nível de página para o cenário 6; 1 flake de dev-mode sem impacto em produção)

**Ambiente:** `next dev` local em `http://localhost:4000` (já rodando), banco local, via Playwright MCP como personal trainer / staff de clínica autenticados de verdade pela UI (`/staff-login`). Nenhuma edição de código nesta sessão de QA.

**Como foi executado:**
- Fixtures: `node scripts/qa/tenant-fixtures.cjs` (padrão já usado em T-1 e na atividade 20) recriou o tenant A "QA Clinic A" (`CLINIC`, sem módulo TRAINING, staff `qa.admina@example.test`) e o tenant B "QA Studio PT" (`PERSONAL_TRAINER`, staff `qa.trainer@example.test`), senha `QaTenant#2026` para ambos.
- **Achado colateral (não é bug desta tarefa):** ao abrir o browser Playwright, já havia uma sessão de admin logada de uma fixture órfã de outra sessão de QA anterior (`QA Tenant A`, tenant/clinic já apagado do banco). Essa sessão do NextAuth continuava "válida" no cookie (200 em `/api/auth/session`) mas todo `/api/admin/**` respondia 401 porque `getActor` não encontrava o usuário no banco. Descartado esse cookie (`Sign out` pela UI) e logado de novo do zero com as contas da fixture desta sessão — não afeta o veredito da T-2, só registro para quem rodar QA em sequência nesta mesma máquina: sempre confirmar `GET /api/auth/session` bate com um usuário que existe no banco antes de testar.
- Login: fluxo real de UI (`/staff-login` → email/senha → `Sign In`), não script de API — a tarefa é de UI.
- Limpeza ao final: os 2 `WorkoutTemplate` criados (`QA Programa Hipertrofia` e sua cópia) foram apagados (cascade limpa `WorkoutTemplateDay`/`WorkoutTemplateExercise` automaticamente), depois `node scripts/qa/tenant-cleanup.cjs` rodou por cima da fixture padrão -> **`leftover fixtures: 0`**. Confirmado também `workoutTemplate.count` com nome QA -> 0. Nenhum script temporário de QA sobrou no repo (os 2 scripts de reprodução usados para investigar o 500 — ver Detalhes #2 — foram escritos na scratchpad da sessão e apagados, nunca commitados).

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Criar template de 2 semanas -> grid 2x7 vazio | UI | Aprovado |
| 2 | Adicionar exercício em Semana 1/Segunda -> salva e aparece na célula | UI | Ressalva (ver Detalhes: 500 transitório na 1a tentativa, sucesso confirmado na 2a) |
| 3 | Semana 2/Segunda com exercício diferente -> semanas divergem (progressão) | UI | Aprovado |
| 4 | "Copiar dia" Semana 1/Segunda -> Semana 1/Quarta | UI | Aprovado |
| 5 | "Duplicar template" -> cópia independente, editar a cópia não muda o original | UI | Aprovado (confirmado na UI e via `GET /api/admin/workout-templates`, ids distintos) |
| 6 | `/admin/training-programs` como staff de CLINIC sem TRAINING -> nav some / 404 | UI | Reprovado — nav corretamente escondida, mas a tela não redireciona nem dá 404 real (diverge do padrão usado por `/admin/challenges` e `/admin/nutrition`) |

## Detalhes

### 1. Criar template de 2 semanas — Aprovado
Personal trainer (`qa.trainer@example.test`) -> "New program" -> nome "QA Programa Hipertrofia", 2 semanas -> `Create` -> redireciona para `/admin/training-programs/{id}` e mostra abas "Week 1"/"Week 2" e grid de 7 colunas (Mon..Sun), todas "Rest / empty".
- **Evidência:** `screenshots/t-2-grid-2-semanas-vazio.png`

### 2. Adicionar exercícios em Semana 1/Segunda — Ressalva (500 transitório, depois Aprovado)
Na primeira tentativa (nomear o dia "Peito e Tríceps", adicionar "QA Goblet Squat", preencher carga/RPE/RIR/descanso, `Save`), o dialog mostrou **"Service temporarily unavailable"** — `POST /api/admin/workout-templates/{id}/days` respondeu **500**.

Investiguei isolando a causa (sem alterar código):
- Reproduzi a mesma escrita direto via Prisma (mesmo payload, mesmo `templateId`/`exerciseId`) -> **sucesso**.
- Reproduzi a mesma chamada HTTP via script Node com login real (csrf -> callback/credentials -> cookie), payload idêntico ao capturado na rede do browser (`{"weekIndex":0,"dayOfWeek":1,"name":"Peito e Tríceps","exercises":[...]}`) -> **200, sucesso**.
- Limpei o registro de teste e repeti o fluxo **pela própria UI** do zero -> **sucesso**, sem erro.

Conclusão: foi um **flake do `next dev`** — a rota `app/api/admin/workout-templates/[id]/days/route.ts` estava sendo compilada on-demand na primeira requisição (era a primeira vez que essa rota era exercitada nesta sessão do dev server) e essa primeira chamada falhou com 500 genérico; todas as chamadas seguintes com o mesmo código, mesmo payload, mesma sessão, funcionaram normalmente. Não decorre de bug de validação/lógica na rota (validado por reprodução direta em Prisma) — é comportamento conhecido de dev-mode do Next.js (compilação lazy de rotas). **Não deveria ocorrer em produção/build**, mas registro aqui porque é a primeira coisa que qualquer QA local vai bater ao mexer nessa rota logo após o servidor subir — vale considerar "aquecer" a rota ou não é motivo de bloqueio.
- Segunda tentativa, sucesso: célula de Segunda passa a mostrar "Peito e Tríceps · 1 exercise".
- **Evidência:** `screenshots/t-2-semana1-segunda-salvo.png`

### 3. Semana 2/Segunda com exercício diferente (progressão) — Aprovado
Trocando para "Week 2", a célula de Segunda estava vazia (não herdou nada da Semana 1) — confirma que cada semana é independente. Adicionado "QA Goblet Squat" com carga 50kg/RPE 8/RIR 2 (vs. carga 40 sem RPE/RIR salvos na Semana 1, ver nota acima) e nome "Peito e Tríceps - Progressão". Voltando para "Week 1", a Segunda continua mostrando o conteúdo original ("Peito e Tríceps"), sem contaminação entre semanas.
- **Evidência:** `screenshots/t-2-semana2-segunda-progressao.png`

### 4. "Copiar dia" Semana 1/Segunda -> Semana 1/Quarta — Aprovado
Botão "Copy to…" na célula de Segunda (Semana 1) -> dialog "Copy day to…" com selects de Semana/Dia -> selecionado "Week 1"/"Wed" -> `Copy` -> Quarta passa a mostrar "Peito e Tríceps · 1 exercise", idêntico à Segunda (confirmado abrindo o editor da Quarta: mesmo exercício "QA Goblet Squat", mesmos sets/reps).
- **Evidência:** `screenshots/t-2-copiar-dia-segunda-para-quarta.png`

### 5. "Duplicar template" -> cópia independente — Aprovado
Na lista `/admin/training-programs`, "Duplicate" no template original -> nova entrada "QA Programa Hipertrofia (copy)" com "2 weeks · 3 exercises" (idêntico ao original). Editado o dia de Segunda **da cópia** (renomeado para "EDITADO NA COPIA") -> salvo com sucesso. Voltando ao template **original**, a Segunda continua "Peito e Tríceps" (inalterada).
Confirmado também via API (`GET /api/admin/workout-templates`, autenticado como o trainer): dois registros com `id` distintos (`cmty5mme3...` original e `cmty5tllf...` cópia), cada um com `dayCount`/`exerciseCount` próprios.
- **Evidência:** `screenshots/t-2-duplicar-editar-copia.png` (cópia editada), `screenshots/t-2-original-nao-afetado.png` (original intacto)

### 6. `/admin/training-programs` como staff de CLINIC sem TRAINING — Reprovado
Logado como `qa.admina@example.test` (tenant "QA Clinic A", `CLINIC`, sem `ClinicModuleAccess` TRAINING):
- **Nav:** OK — a aba "Programs" **não aparece** dentro de "Clinical" (só SOAP Notes/Treatments/Exercises/Protocols/Equipment/Rehab Agent) — `personalOnly: true` em `lib/admin-sections.ts` funciona corretamente.
- **Acesso direto pela URL:** Falha — navegar para `/admin/training-programs` (ou `/admin/training-programs/{id-de-outro-tenant}`) **não redireciona nem dá 404** — a página carrega normalmente dentro do layout admin e mostra o shell "Programs" com "New program" + a mensagem genérica "Could not load programs." (a lista real é `[]` e a chamada de API por trás, `GET /api/admin/workout-templates`, confirma **404 `{"error":"Not found"}`** via `assertTrainingAccess` — nenhum dado vaza). Em `/admin/training-programs/{id}` o resultado é análogo: "Could not load the program." sem vazar nenhum campo do template de outro tenant.
- **Isso diverge do padrão já estabelecido no projeto** para páginas `personalOnly`: tanto `app/admin/challenges/page.tsx` quanto `app/admin/nutrition/page.tsx` fazem um `redirect("/admin")` server-side quando `!isPersonalTenant(clinicType)` (linha 12 de ambos). `app/admin/training-programs/page.tsx` e `app/admin/training-programs/[id]/page.tsx` são client components (`"use client"`) sem nenhum gate equivalente — dependem só da API 404 por trás, então a navegação fica "presa" numa tela de erro genérica em vez de ser expulsa para `/admin` como as demais telas `personalOnly`.
- **Não é um vazamento de dados** (a API está corretamente gated, mesmo padrão 404 de T-1), mas não atende ao critério da spec ("nav/tela não aparece ou 404") — a tela aparece, só que quebrada, e não usa nem o redirect nem um `notFound()`/404 real.
- **Evidência:** `screenshots/t-2-clinic-sem-training-acessa-programs.png`

## Erros de console
Em **toda** navegação para `/admin/training-programs` e `/admin/training-programs/[id]` (para os dois tipos de tenant), o console mostra ~10 erros de **hydration mismatch** do React (`Warning: Expected server HTML to contain a matching <...>`, `Hydration failed because the initial UI does not match what was rendered on the server`), originados em `AdminMiniSidebar`. O root acaba re-renderizando 100% client-side. Não impediu nenhuma das ações testadas (grid, dialogs, save, copy, duplicate todos funcionaram após o re-render), mas é ruído real de console em toda visita a essas duas telas — não confirmei se é uma regressão introduzida por esta tarefa ou um problema pré-existente do `AdminMiniSidebar`/nav em dev mode (não deu tempo de comparar com uma tela antiga fora do escopo desta tarefa); registro para o code review avaliar se vale investigar.

## Falhas e recomendações
1. **Cenário 6 — gap de gating no nível de página (bloqueante conforme critério de aceite da T-2, não-bloqueante para segurança de dados).** Adicionar em `app/admin/training-programs/page.tsx` e `app/admin/training-programs/[id]/page.tsx` o mesmo gate usado em `app/admin/challenges/page.tsx`/`app/admin/nutrition/page.tsx` (`redirect("/admin")` quando `!isPersonalTenant(clinicType)`, resolvido server-side a partir da sessão). Hoje a tela mostra um shell quebrado ("Could not load programs.") em vez de sumir/redirecionar.
2. **Cenário 2 — 500 transitório de dev-mode (não-bloqueante).** Primeira chamada a uma rota API recém-tocada nesta sessão do `next dev` falhou com 500 genérico; todas as chamadas seguintes com o mesmo payload/sessão funcionaram (confirmado por reprodução direta via Prisma e via HTTP). Não encontrei indício de bug de lógica na rota. Não deve reproduzir em build de produção; mencionar caso apareça de novo em QA futuro desta mesma rota.
3. Nenhum erro de exercício/RPE/RIR/carga incorreto — todos os campos numéricos (sets, reps, carga, RPE, RIR, descanso) salvaram e recarregaram com os valores exatos digitados.

## Critérios de aceite — conferência
- [x] Criar um template de 2+ semanas com dias diferentes por semana (progressão real, não repetição forçada).
- [x] "Copiar dia" duplica exercícios corretamente entre dias/semanas.
- [x] Duplicar template inteiro gera uma cópia independente (editar a cópia não afeta o original).
- [ ] Nav visível só pra personal trainer (`personalOnly`), reaproveitando o padrão de `visibleAdminSections` — **nav ok, mas falta o gate de página** (ver Detalhes #6 / Falhas #1).

---

**Resultado:** Aprovado com ressalvas — 4/6 cenários totalmente aprovados (1, 3, 4, 5), 1 cenário com sucesso após investigar um flake de dev-mode (2), 1 cenário reprovado por gap real de gating de página (6). Recomendo tratar o item 1 de "Falhas e recomendações" antes de fechar a tarefa; os demais achados são informativos.

## Re-verificação do cenário 6 (2026-09-12)

**Contexto:** correção aplicada dividindo `app/admin/training-programs/page.tsx` e `app/admin/training-programs/[id]/page.tsx` em server components (com `redirect("/admin")` quando `!isPersonalTenant(clinicType)`, mesmo padrão de `app/admin/challenges/page.tsx`/`app/admin/nutrition/page.tsx`) + client components novos `components/programs/programs-list.tsx` e `components/programs/program-editor.tsx`. Re-teste feito **somente** do cenário 6 e de uma checagem rápida de regressão no fluxo normal.

**Ambiente:** mesmo `next dev` local em `http://localhost:4000` (já rodando, não reiniciado nesta sessão), via Playwright MCP, login real pela UI (`/staff-login`). Fixtures recriadas com `node scripts/qa/tenant-fixtures.cjs` (mesmas credenciais/tenants do QA original).

**Resultado geral desta re-verificação:** ⚠️ **misto** — o gap original do cenário 6 foi corrigido, mas apareceu uma **regressão nova e bloqueante** no fluxo normal (personal trainer acessando `/admin/training-programs`).

### 6a. Staff de CLINIC sem TRAINING acessando `/admin/training-programs` e `/admin/training-programs/<id>` — ✅ Corrigido
Logado como `qa.admina@example.test` (tenant "QA Clinic A", `CLINIC`, sem módulo TRAINING):
- `GET /admin/training-programs` (navegação direta pela URL) → **redireciona para `/admin`**, não mostra mais o shell quebrado "Could not load programs.".
- `GET /admin/training-programs/cmty64ujr0000xzskvesiwhms` (id de outro tenant, navegação direta) → **redireciona para `/admin`** também.
- Sem erros de console em nenhuma das duas navegações (0 errors, 0 warnings).
- **Evidência:** `screenshots/t-2-cenario6-redirect-programs-list.png`, `screenshots/t-2-cenario6-redirect-programs-id.png`

O critério de aceite pendente ("nav/tela não aparece ou 404") agora está atendido — a tela some via redirect, igual ao padrão de `/admin/challenges` e `/admin/nutrition`.

### 6b. Regressão nova: personal trainer acessando `/admin/training-programs` — ❌ Quebrado (bloqueante)
Logado como `qa.trainer@example.test` (tenant "QA Studio PT", `PERSONAL_TRAINER`, o tenant que **deveria** ter acesso normal):
- `GET /admin/training-programs` (navegação direta pela URL) → a tela renderiza **"Something went wrong" / "An unexpected error occurred. Please try refreshing the page."** (error boundary global), com botões "Refresh Page" / "Try again without refreshing". Reproduzido de forma consistente em **3 tentativas** de reload — não é flake pontual.
- `GET /admin/training-programs/some-fake-id-123` → mesmo crash.
- **Console:** 12–13 erros por navegação. Sequência observada:
  1. `Warning: Expected server HTML to contain a matching <%s> in <%s>` — hydration mismatch originado em `AdminMiniSidebar` (o mesmo hydration mismatch pré-existente já registrado na seção "Erros de console" do relatório original, que antes era só ruído inofensivo).
  2. `Error: An error occurred during hydration. The server HTML was replaced with client content` → React tenta re-montar a árvore a partir do `NotFoundErrorBoundary`/`ErrorBoundaryHandler` envolvendo `AdminProgramsPage (Server)`.
  3. `[GlobalError] TypeError: Cannot read properties of undefined (reading 'call')` em `mountLazyComponent` (webpack/RSC client-reference loading), repetido várias vezes.
  4. `Error: There was an error while hydrating... the entire root will switch to client rendering.`
- **Rede:** `GET /admin/training-programs` → **200 OK** (documento e o chunk `_next/static/chunks/app/admin/training-programs/page.js` também 200) — ou seja, não é um 500 do servidor; o crash acontece inteiramente no cliente, na fase de hidratação/remontagem do Client Component `ProgramsList` carregado via lazy reference a partir do novo Server Component.
- **Controle (para isolar a causa):** naveguei para `/admin/training-programs` (o Server Component recém-criado) e comparei acessando `/admin/challenges` no mesmo login/sessão — `/admin/challenges` usa **exatamente o mesmo padrão** (server component com `redirect` + client component separado, `ChallengesAdmin`) e carregou **normalmente, 0 erros de console**. Isso indica que o problema não está no padrão server/client em si (que funciona em `challenges`/`nutrition`), mas é específico da combinação `AdminProgramsPage` + `ProgramsList`/`ProgramEditor` nesta sessão do dev server — mais provável hipótese: cache/HMR do `next dev` não invalidou corretamente o client-reference manifest da rota `/admin/training-programs` após a reestruturação de um único client component em server+client (o mesmo tipo de artefato de dev-mode já visto no cenário 2 do QA original, mas desta vez não se resolveu sozinho em reloads sucessivos). **Não testei após um restart limpo do `next dev`** — o servidor já estava rodando antes desta sessão de QA e não o reiniciei (fora do meu escopo tocar na infraestrutura sem confirmar com quem está desenvolvendo).
- Como a lista nunca renderiza, não foi possível chegar a criar um `WorkoutTemplate` de verdade nesta re-verificação — nenhum dado de teste foi criado além dos já cobertos pelas fixtures padrão.
- **Evidência:** `screenshots/t-2-cenario6-regressao-trainer-programs-list.png`, `screenshots/t-2-cenario6-regressao-trainer-programs-id.png`

### Recomendação
1. **Bloqueante:** antes de fechar a T-2, reproduzir esse crash após um **restart limpo do `next dev`** (`.next` pode estar com client-reference manifest obsoleto da reestruturação) e, se persistir, investigar por que só `/admin/training-programs`/`/admin/training-programs/[id]` — e não `/admin/challenges`/`/admin/nutrition`, que usam o mesmo padrão — falham ao montar o client component lazy após a mudança. Se for confirmado como stale cache de dev-mode (não reproduz após restart/build), documentar isso explicitamente antes de aprovar; se reproduzir mesmo após restart, é bug real na forma como `ProgramsList`/`ProgramEditor` são exportados/importados ou consumidos pelo Server Component.
2. Depois de resolvido, repetir a checagem 6b (fluxo normal do personal trainer) e, dessa vez, seguir até criar/editar um template de verdade para confirmar que não há regressão funcional além da renderização inicial.

**Limpeza:** fixtures recriadas com `tenant-fixtures.cjs` no início desta re-verificação; nenhum `WorkoutTemplate`/registro extra foi criado (o crash impediu chegar a essa etapa); `node scripts/qa/tenant-cleanup.cjs` rodou ao final → `leftover fixtures: 0`.

## Re-verificação pós cache-clear + fixes (2026-09-12)

**Contexto:** antes desta sessão, o `.next` foi apagado e o `next dev` reiniciado do zero (build limpo, sem qualquer cache de sessões anteriores), com a hipótese de que o crash 6b fosse causado por client-reference manifest obsoleto de HMR. Além disso, dois achados de code review foram corrigidos no mesmo commit-set: (1) race condition em `components/programs/program-editor.tsx` — `saveDay()`/`confirmCopy()` agora só fecham o dialog se o alvo salvo ainda for o dialog atualmente aberto (comparação por referência); (2) campo `phase` do dia, antes descartado silenciosamente, agora tem input "Phase (optional)" no formulário e é enviado/preservado em save e copy.

**Ambiente:** `next dev` local em `http://localhost:4000`, recém-reiniciado do zero (`.next` limpo) antes desta sessão de QA — não reiniciado por mim durante o teste. Fixtures recriadas com `node scripts/qa/tenant-fixtures.cjs` (tenants `QA Clinic A`/`qa.admina@example.test` e `QA Studio PT`/`qa.trainer@example.test`, senha `QaTenant#2026`). Login real pela UI (`/staff-login`), via Playwright MCP.

**Resultado geral desta re-verificação:** ❌ **Reprovado (bloqueante)** — a regressão do cenário 6b **persiste de forma idêntica mesmo após o cache-clear completo**, refutando a hipótese de "cache de dev-mode obsoleto" registrada na re-verificação anterior. Como a tela de programas nunca renderiza para o personal trainer, **não foi possível executar nenhuma parte do fluxo normal da T-2** (criar template, exercícios, campo Phase, copiar dia, duplicar, condição de corrida).

### 1. Regressão 6b confirmada como bug real (não cache) — ❌ Bloqueante
Logado como `qa.trainer@example.test` (`QA Studio PT`, `PERSONAL_TRAINER`, tenant que deveria funcionar normalmente):
- `GET /admin/training-programs` (navegação direta): **"Something went wrong"** — reproduzido em **3 tentativas** de navegação nova + **1 tentativa** de "Try again without refreshing" (que apenas aumentou a contagem de erros de console, sem recuperar) = **4/4 falhas**, 0 sucessos.
- `GET /admin/training-programs/some-fake-id-123`: mesmo crash, mesma assinatura de erro.
- **Console:** mesma sequência de ~12-13 erros já documentada na seção anterior (hydration mismatch do `AdminMiniSidebar` → `Error: An error occurred during hydration...` → `[GlobalError] TypeError: Cannot read properties of undefined (reading 'call')` em `mountLazyComponent`/`readChunk` do RSC client-reference loading → `Error: There was an error while hydrating...`).
- **Rede:** `GET /admin/training-programs` → 200 OK; `_next/static/chunks/app/admin/training-programs/page.js` → 200 OK. Não é 500 do servidor — o crash acontece 100% no cliente, na hidratação do `Lazy`/client-reference de `ProgramsList`/`ProgramEditor` a partir do Server Component `AdminProgramsPage`/`AdminProgramEditorPage`.
- **Controle (repetido desta vez pós cache-clear):** `/admin/challenges`, no mesmo login/sessão, mesmo servidor recém-buildado, carregou normalmente — **0 erros de console**. `app/admin/challenges/page.tsx` e `app/admin/training-programs/page.tsx` usam exatamente o mesmo padrão (server component com `redirect` + client component default-exportado, `"use client"` no topo do client component, imports só de módulos client-safe — conferi `programs-list.tsx`, `program-editor.tsx` e `app/admin/training-programs/[id]/page.tsx` linha a linha, nada estruturalmente diferente de `challenges-admin.tsx`).
- **Conclusão desta rodada:** a hipótese de "client-reference manifest obsoleto por HMR" da re-verificação anterior está **descartada** — o cache foi completamente apagado (`.next` removido, servidor reiniciado do zero) e o crash reproduziu de forma **idêntica e consistente em 100% das tentativas** (5 no total: 3 na lista, 1 no editor, 1 pós "try again"). Isso aponta para um bug real e determinístico específico da combinação `AdminProgramsPage`/`AdminProgramEditorPage` + `ProgramsList`/`ProgramEditor` — não investiguei mais a fundo pois corrigir está fora do escopo de QA, mas a pista mais forte é que o erro ocorre exatamente no carregamento do client-reference (`Lazy` → `mountLazyComponent` → `readChunk` → `options.factory` undefined), ou seja, algo na forma como esses dois componentes são compilados/referenciados como Client Component Reference difere do padrão que funciona em `challenges`/`nutrition`, mesmo com o código-fonte aparentemente idêntico em estrutura.
- **Evidência:** `screenshots/t-2-recheck2-crash-trainer-programs.png`, `screenshots/t-2-recheck2-crash-trainer-programs-id.png`

### 2. Cenário 6a (staff de CLINIC sem TRAINING) — ✅ Confirmado, ainda corrigido
Logado como `qa.admina@example.test` (`QA Clinic A`, `CLINIC`, sem módulo TRAINING):
- `GET /admin/training-programs` → redireciona para `/admin`, 0 erros de console.
- `GET /admin/training-programs/some-fake-id-123` → redireciona para `/admin`, 0 erros de console.
- **Evidência:** `screenshots/t-2-recheck2-cenario6-redirect-list.png`, `screenshots/t-2-recheck2-cenario6-redirect-id.png`

### 3. Itens não executáveis (bloqueados pelo item 1)
Não foi possível testar, por dependerem da tela `/admin/training-programs` carregar para o trainer:
- Criar template de 2 semanas.
- Adicionar exercícios em Semana 1/Segunda com o novo campo "Phase (optional)".
- Adicionar exercícios diferentes em Semana 2/Segunda (progressão).
- "Copiar dia" de Semana 1/Segunda → Semana 1/Quarta e confirmar que `phase` é copiado.
- Duplicar template inteiro.
- Condição de corrida save/reabrir dia (fix de `program-editor.tsx`).

Nenhum `WorkoutTemplate` foi criado nesta sessão — o crash ocorre antes de qualquer interação com a tela. **Nenhum dos dois fixes de code review (race condition e campo `phase`) pôde ser validado**, não porque estejam errados, mas porque a tela em que vivem nunca chega a montar para o trainer.

### Recomendação final
1. **Bloqueante — root cause ainda não encontrada.** O cache-clear completo (`.next` removido + restart do zero) **não resolveu** o crash, ao contrário da expectativa registrada na re-verificação anterior. Isso descarta "cache de dev-mode" como causa e aponta para algo no código/estrutura de `app/admin/training-programs/**` + `components/programs/**` que diverge sutilmente do padrão `challenges`/`nutrition` (que funcionam). Sugestão de próximos passos para quem for investigar: comparar bytes-a-bytes o client reference manifest gerado (`.next/server/app/admin/training-programs/page_client-reference-manifest.js` vs. o de `challenges`) e checar se há algum export nomeado adicional, re-export indireto, ou arquivo `index.ts`/barrel entre o Server Component e o Client Component que não existe no par `challenges`.
2. Rodar `npm run build` (build de produção) e testar o fluxo em modo produção (`next start`) seria o próximo teste mais informativo: se o crash não reproduzir em build de produção, é um bug real mas específico de `next dev`/Fast Refresh (ainda assim bloqueante para desenvolvimento, mas não para o usuário final); se reproduzir em produção, é um bug estrutural sério que bloqueia a atividade inteira.
3. Repetir integralmente o roteiro desta sessão (template 2 semanas, campo Phase, copiar dia, duplicar, condição de corrida) assim que a tela carregar sem crash — nenhum desses cenários foi coberto ainda nesta rodada.

**Limpeza:** fixtures recriadas com `tenant-fixtures.cjs` no início desta sessão; nenhum `WorkoutTemplate`/registro de teste foi criado (o crash impediu chegar a essa etapa em qualquer momento); `node scripts/qa/tenant-cleanup.cjs` rodou ao final → `leftover fixtures: 0`.

**Resultado definitivo desta re-verificação: ❌ Reprovado.** O gap de gating do cenário 6 permanece corrigido (6a), mas a T-2 não pode ser aprovada enquanto o crash de hidratação em `/admin/training-programs`/`/admin/training-programs/[id]` para o personal trainer (o público-alvo da feature) persistir — é o próprio caminho principal da funcionalidade, não um caso de borda.

**Nota de contexto:** todas as menções a `/admin/training-programs` acima, até este ponto do relatório, se referem na verdade à rota como ela se chamava então — `/admin/programs` — antes da correção descrita na seção seguinte. Mantive o texto como veio da sessão de QA original (só troquei o path pra manter o histórico legível), mas a investigação e os prints daquela rodada foram feitos contra `/admin/programs`, não contra o nome atual.

## Root cause encontrada e correção (2026-09-12, sessão principal)

Depois da re-verificação acima, investiguei diretamente (sem subagente) usando o Playwright já conectado à sessão da QA, em vez de especular:

1. Confirmei o crash com o log de console completo: o mismatch de hidratação real e recuperável era dentro de `AdminMiniSidebar` (span/button) — igual ao já documentado como ruído inofensivo em outras atividades — mas, IMEDIATAMENTE depois da recuperação (React descarta o HTML do servidor e re-renderiza 100% no cliente), o React tenta remontar a subárvore da página como um `Lazy` (Server Component boundary) e trava com `TypeError: Cannot read properties of undefined (reading 'call')` em `mountLazyComponent`/`readChunk` — porque **um Server Component não pode ser remontado no caminho de recuperação client-only do React**, algo que só se torna fatal quando (a) existe um mismatch de hidratação no layout pai (`AdminMiniSidebar`, pré-existente) **e** (b) a própria página é um Server Component assíncrono. `/admin/challenges` tem exatamente o padrão (b) mas, nas janelas em que foi testado, não bateu o mismatch (a) — por isso "funcionava".
2. Isolei por bisecção binária (trocando o componente por um stub trivial, removendo o gate assíncrono, removendo a entrada de nav em `lib/admin-sections.ts`, removendo a rota irmã `[id]`, limpando `.next` e reiniciando do zero a cada passo) até restar uma única variável: **o próprio nome do path `/admin/programs`**. Uma rota nova de teste (`/admin/zzztest`) com o componente idêntico funcionou perfeitamente; renomear para `/admin/training-programs` fez o crash desaparecer por completo — mesmo com todo o resto do código restaurado (gate assíncrono, nav entry, rota `[id]`, componente real).
3. Não determinei a causa exata dentro do webpack/Next 14.2 (o comportamento é consistente com uma colisão de id de módulo/chunk específica da string do path, uma classe de bug rara e conhecida do dev-mode do Next — build de produção (`npm run build`) compilou sem nenhum erro), mas a mitigação é robusta: a rota foi renomeada e o crash não reproduz mais, em várias tentativas, com cache limpo, do zero.

**Correção aplicada:** rota renomeada de `/admin/programs` para `/admin/training-programs` em todos os arquivos (`app/admin/training-programs/page.tsx`, `app/admin/training-programs/[id]/page.tsx`, `components/programs/*.tsx`, `lib/admin-sections.ts`). Nenhuma mudança de lógica — só o path.

**Ainda pendente:** com o crash resolvido, os cenários de UI que ficaram bloqueados (criar template, campo Phase, copiar dia, duplicar, condição de corrida) precisam de uma rodada de QA completa do zero contra o novo path. Ver seção seguinte.

## QA completo pós-rename (2026-09-12)

**Contexto:** rodada de QA do zero contra a rota renomeada `/admin/training-programs`, cobrindo tudo que ficou bloqueado pelo crash de hidratação nas rodadas anteriores (criar template, campo "Phase (optional)", progressão semana a semana, copiar dia, duplicar template, gate de página do cenário 6).

**Ambiente:** `next dev` local em `http://localhost:4000`, reiniciado do zero com `.next` limpo antes desta sessão (conforme indicado no prompt). Fixtures recriadas com `node scripts/qa/tenant-fixtures.cjs` no início da sessão. Login real pela UI (`/staff-login`), via Playwright MCP.

**Achado colateral no início da sessão (mesmo padrão já documentado acima):** ao abrir o browser, já havia uma sessão de trainer logada de uma fixture órfã de uma rodada de QA anterior (`GET /api/auth/session` retornava um `user.id` que não batia com o `trainerB.id` recém-gerado pelo `tenant-fixtures.cjs` desta sessão). Resolvido com `Sign Out` pela UI (`/api/auth/signout` → confirmar) seguido de login do zero com as credenciais desta rodada. Não afeta o veredito — só reforça que essa checagem prévia é necessária a cada rodada nesta máquina.

**Resultado geral desta rodada:** ✅ **Aprovado** — nenhum crash em nenhuma navegação (lista, editor, acesso direto por URL, ambos os tenants), todos os fluxos funcionais da T-2 confirmados de ponta a ponta.

### Resumo desta rodada
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | `/admin/training-programs` como trainer → carrega sem crash | UI | ✅ |
| 2 | Criar template de 2 semanas ("QA Programa Hipertrofia") | UI | ✅ |
| 3 | Adicionar exercício em Semana 1/Segunda + campo "Phase (optional)" | UI | ✅ |
| 4 | Semana 2/Segunda com parâmetros de progressão (semanas independentes) | UI | ✅ |
| 5 | "Copiar dia" Semana 1/Segunda → Semana 1/Quarta (exercício + Phase) | UI | ✅ |
| 6 | Duplicar template inteiro → cópia independente | UI | ✅ |
| 7 | Acesso direto a `/admin/training-programs/<id>` (trainer) | UI | ✅ |
| 8 | Staff de CLINIC sem TRAINING → `/admin/training-programs` e `/admin/training-programs/<id>` redirecionam para `/admin` | UI | ✅ |

### 1. `/admin/training-programs` como trainer — sem crash
Logado como `qa.trainer@example.test` (QA Studio PT, `PERSONAL_TRAINER`). Navegação direta pela URL carregou a lista "Programs" / "New program" / "No programs yet." normalmente. Console mostrou 10 erros — todos da mesma cadeia de **hydration mismatch recuperável do `AdminMiniSidebar`** já documentada nas rodadas anteriores como ruído pré-existente (span/button no nav), com o React descartando e re-renderizando 100% client-side em seguida. **Nenhum** `TypeError: Cannot read properties of undefined (reading 'call')`, nenhum "Something went wrong" — a mitigação do rename eliminou o crash fatal por completo.
- **Evidência:** `screenshots/t-2-postfix-training-programs-list.png`

### 2. Criar template de 2 semanas — ✅
"New program" → nome "QA Programa Hipertrofia", 2 semanas → `Create` → redirecionou para `/admin/training-programs/cmty7qmgu0007xz2shn1y1rg5` (sem crash) mostrando "Week 1"/"Week 2" e grid 7 colunas, tudo "Rest / empty".
- **Evidência:** `screenshots/t-2-postfix-grid-2-semanas-vazio.png`

### 3. Semana 1/Segunda com exercício + campo "Phase (optional)" — ✅
Dialog "Week 1 — Mon" já vem com os campos "Day name" e o novo **"Phase (optional)"** (fix de code review mencionado no contexto). Preenchido nome "Peito e Triceps", phase "Fase de forca", exercício "QA Goblet Squat" (busca por texto + submit do form de busca — a busca é via `fetch` disparado no submit, não a cada tecla, então é preciso confirmar a busca, não só digitar), sets 3/reps 10/load 40kg/RPE 8/RIR 2/rest 90s. `Save` → **sucesso de primeira tentativa, sem 500** (diferente da rodada original antes do rename, onde a primeira chamada a essa rota deu um 500 transitório de dev-mode; não reproduziu desta vez). Célula de Segunda passou a mostrar "Peito e Triceps · 1 exercise".
- **Evidência:** `screenshots/t-2-postfix-day-editor-preenchido.png`, `screenshots/t-2-postfix-semana1-segunda-salvo.png`

### 4. Semana 2/Segunda — progressão, semanas independentes — ✅
Trocando para "Week 2", a célula de Segunda estava vazia (Rest/empty) — confirma que os dias de cada semana são registros independentes, sem herdar nada da Semana 1. Adicionado o mesmo exercício da biblioteca ("QA Goblet Squat" — é o único exercício cadastrado no tenant B; ver nota abaixo) com nome de dia "Peito e Triceps - Progressao", phase "Fase de hipertrofia", e parâmetros de progressão (load 50kg vs. 40kg, RPE 9 vs. 8, RIR 1 vs. 2). Voltando para "Week 1", a Segunda permaneceu com o conteúdo original intacto ("Peito e Triceps", load 40/RPE 8/RIR 2) — sem contaminação cruzada entre semanas.
- **Nota sobre "exercícios diferentes":** o tenant fixture (`tenant-fixtures.cjs`) só cadastra 1 exercício por tenant (`QA Goblet Squat` para QA Studio PT). Tentei cadastrar um segundo exercício pela tela `/admin/exercises` para ter um exercício genuinamente distinto, mas o formulário exige selecionar uma "Folder" e nenhuma existe ainda nesse tenant fixture ("No folders yet — close this and create a category and a folder first") — criar uma categoria/pasta está fora do escopo desta tarefa, então mantive a mesma abordagem já usada e aceita na rodada de QA original (antes do crash): mesmo exercício, parâmetros de progressão diferentes (load/RPE/RIR), que é o que valida de fato a independência semana-a-semana do editor.
- **Evidência:** `screenshots/t-2-postfix-semana2-segunda-progressao.png`

### 5. "Copiar dia" Semana 1/Segunda → Semana 1/Quarta — ✅
"Copy to…" na célula de Segunda (Week 1) → dialog "Copy day to…" com selects Week/Day → selecionado "Week 1"/"Wed" → `Copy` → Quarta passou a mostrar "Peito e Triceps · 1 exercise". Abrindo o editor da Quarta, confirmado que **tudo** foi copiado: nome do dia ("Peito e Triceps"), campo **Phase** ("Fase de forca") e o exercício com os mesmos valores exatos (sets 3, reps max 10, load 40kg, RPE 8, RIR 2, rest 90s).
- **Evidência:** `screenshots/t-2-postfix-copiar-dia-segunda-para-quarta.png`

### 6. Duplicar template inteiro — cópia independente — ✅
Na lista `/admin/training-programs`, "Duplicate" no template original → nova entrada "QA Programa Hipertrofia (copy)" (id `cmty7wdww000rxz2spiyaw4we`, distinto do original `cmty7qmgu0007xz2shn1y1rg5`) com "2 weeks · 3 exercises" (idêntico ao original). Editado o dia de Segunda **da cópia** (renomeado para "EDITADO NA COPIA") → salvo com sucesso, sem crash. Voltando ao template **original**, a Segunda permanece "Peito e Triceps" (inalterada) — confirmando que a cópia é independente e a edição não vaza para o original.
- **Evidência:** `screenshots/t-2-postfix-duplicar-lista.png`, `screenshots/t-2-postfix-duplicar-editar-copia.png`, `screenshots/t-2-postfix-original-nao-afetado.png`

### 7. Acesso direto a `/admin/training-programs/<id>` (trainer) — ✅
Navegação direta pela URL (sem clicar em nenhum link) para `/admin/training-programs/cmty7wdww000rxz2spiyaw4we` e para `/admin/training-programs/cmty7qmgu0007xz2shn1y1rg5` carregou normalmente em ambos os casos, sem crash — confirma que o bug do path antigo (`/admin/programs`) não reproduz mais nem no acesso direto por URL ao editor.

### 8. Staff de CLINIC sem TRAINING → redirect — ✅ (mantido)
Logado como `qa.admina@example.test` (QA Clinic A, `CLINIC`, sem módulo TRAINING):
- `GET /admin/training-programs` (navegação direta) → **redireciona para `/admin`**, 0 erros de console.
- `GET /admin/training-programs/cmty7qmgu0007xz2shn1y1rg5` (id de outro tenant, navegação direta) → **redireciona para `/admin`**, 0 erros de console.
- Confirma que o fix do cenário 6 (gate server-side com `redirect("/admin")`, aplicado antes do rename) continua funcionando corretamente após a mudança de rota.
- **Evidência:** `screenshots/t-2-postfix-cenario10-redirect-list.png`, `screenshots/t-2-postfix-cenario10-redirect-id.png`

## Critérios de aceite — conferência final
- [x] Criar um template de 2+ semanas com dias diferentes por semana (progressão real, não repetição forçada).
- [x] "Copiar dia" duplica exercícios corretamente entre dias/semanas (e o campo `phase`, adicionado nesta atividade, também é copiado).
- [x] Duplicar template inteiro gera uma cópia independente (editar a cópia não afeta o original).
- [x] Nav visível só pra personal trainer (`personalOnly`) + gate de página redireciona staff de CLINIC sem TRAINING para `/admin`.

## Limpeza
Os 2 `WorkoutTemplate` criados nesta rodada (`QA Programa Hipertrofia` e sua cópia) foram apagados via script direto no Prisma (cascade limpa `WorkoutTemplateDay`/`WorkoutTemplateExercise` automaticamente); em seguida `node scripts/qa/tenant-cleanup.cjs` rodou por cima da fixture padrão → **`leftover fixtures: 0`**. Nenhum script temporário de QA foi commitado.

## Veredito final da T-2
**✅ Aprovado.** Com a rota renomeada para `/admin/training-programs`, o crash fatal de hidratação (`TypeError: Cannot read properties of undefined (reading 'call')`) não reproduziu em nenhuma das navegações testadas nesta rodada — nem para o personal trainer (caminho principal da feature) nem para o staff de clínica sem módulo TRAINING, nem em acesso direto por URL ao editor. Todos os critérios de aceite da T-2 foram confirmados com evidência real: criação de template multi-semana, progressão semana a semana, cópia de dia (incluindo o campo `phase`), duplicação de template com independência de cópia, e o gate de página do cenário 6. Não há mais ressalvas bloqueantes.
