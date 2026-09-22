# QA — T-2: Gating do paciente + remoção dos módulos do aluno

**Data:** 22/09/2026 (duas rodadas) · **Branch:** `brunoto02028/app_clinic`
**Ambiente:** local — Next dev `http://localhost:4000`, app Expo Web `http://localhost:8081` (`EXPO_PUBLIC_API_URL=http://localhost:4000`), Postgres `bpr_clinic_local`
**Veredito:** ✅ **APROVADA** na 2ª rodada.

## Histórico

| Rodada | Veredito | Motivo |
|---|---|---|
| 1ª | ❌ REPROVADA | F1 (`clinica` sumia ao conceder qualquer módulo) e F2 (sem guard de rota: BA/Lab abriam por deep link) |
| 2ª | ✅ APROVADA | F1, F2 e F4 corrigidos e comprovados; F3 encaminhado à atividade 071 |

## Resumo

| # | Cenário | Tipo | 1ª | 2ª |
|---|---------|------|----|----|
| C1 | Paciente sem `ClinicModuleAccess` → só `clinica` | API | ✅ | ✅ |
| C2 | Paciente com acesso configurado | API | ✅ | não reexecutado (filtro inalterado) |
| C3 | Admin / superadmin / `fullAccessOverride` | API+UI | ✅ | ✅ |
| C4 | Tenant PERSONAL → `[]` | API | ✅ | ✅ |
| C4b | Aluno vê aviso, sem tela branca | UI | ✅ | ✅ |
| C5 | `moduleOverrides` libera BA/Lab | API | ⚠️ derrubava `clinica` | ✅ corrigido |
| C5b | Lab liga por dado, sem release | API+UI | ⚠️ devolvia `[lab]` sozinho | ✅ corrigido |
| C6 | Sem token / token inválido → 401 | API | ✅ | não reexecutado (auth inalterada) |
| C7 | Paciente cai direto na clínica | UI | ✅ | ✅ |
| C8 | Deep link para BA/Lab bloqueado | UI | ❌ **FALHOU** | ✅ corrigido |
| C9 | Seletor para 2+ módulos | UI | ✅ | ✅ |
| C10 | Identidade | UI | ⏭️ é da T-3 | ⏭️ |
| F4 | Erro do endpoint não cai em seletor vazio | UI | ❌ falhou | ✅ corrigido |

## Prova da regressão que a T-2 corrige (1ª rodada)

Restaurando temporariamente o `route.ts` do `HEAD` e repetindo com os mesmos tokens:

```
# P1, paciente de clínica sem ClinicModuleAccess
[{"key":"lab",...},{"key":"clinica",...},{"key":"ba",...}]

# P4, aluno de tenant PERSONAL
[{"key":"treino",...},{"key":"avaliacoes",...},{"key":"nutricao",...}]
```

**Agravante:** as clínicas reais da BPR têm **zero** linhas de `ClinicModuleAccess`:

```
bruno-physical-rehabilitation | CLINIC | modules= []
bruno-physical-rehab          | CLINIC | modules= []
```

Não era caso de borda — **todo paciente da BPR caía no fallback e recebia BA e Lab.**

## Correções entre as rodadas

1. **`app/api/mobile/modules/route.ts`** — `clinica` reinserido para paciente de tenant CLINIC salvo `moduleOverrides.mod_clinica === false`; resultado remontado a partir de `MODULE_DEFS` para ordem estável.
2. **`mobile/src/components/ModuleGuard.tsx`** (novo) — lê a query `["modules"]` e redireciona para `/(app)/module-select` quando o módulo não está na lista. Falha fechado: `isLoading` não renderiza, `isError` conta como "não". Aplicado em `(clinica)`, `(ba)` e `(lab)`.
3. **`mobile/app/(app)/module-select.tsx`** — ramo `isError` com "We could not load your areas" e "Try again" chamando `refetch()`.

Bundle Metro: 1034 → 1037 módulos, sem erro de resolução.

## Evidências — 2ª rodada

### C1, C3, C4 — API

```
C1  P1 paciente sem ClinicModuleAccess   -> [clinica]           HTTP 200
C3  P3 admin                             -> [lab, clinica, ba]  HTTP 200
C4  P4 aluno PERSONAL                    -> []                  HTTP 200
C4  P5 ADMIN do estúdio PERSONAL         -> []                  HTTP 200
```

### C5 — `moduleOverrides` (F1 corrigido)

```
mod_ba = true                      -> [clinica, ba]    (antes: [ba])
mod_lab = true                     -> [lab, clinica]   (antes: [lab])
mod_ba=true + mod_clinica=false    -> [ba]
reset                              -> [clinica]
```

### C5b — Lab liga por dado (F1 corrigido)

Com **só `DIAGNOSTICS`** ligado, que é o estado real das clínicas da BPR:

```
passo 0 (nada ligado)      -> [clinica]
passo 1 (DIAGNOSTICS on)   -> [lab, clinica]    <- antes vinha só [lab]
passo 2 (DIAGNOSTICS off)  -> [clinica]
```

Na UI, mesmo bundle Metro, sem rebuild: seletor mostra Laboratory + Clinic, o Lab abre, e **a área clínica continua acessível**. Desligando, o deep link do Lab volta a ser bloqueado.

Screenshots: `t-2r-c5b-lab-mais-clinica.png`, `t-2r-c5b-clinica-continua-acessivel.png`.

### C8 — Deep link bloqueado (F2 corrigido)

Logado como P1 (lista = `[clinica]`), cinco rotas, todas bloqueadas → redirecionam para `/module-select`, que com 1 módulo leva direto à clínica. **Nenhum dado de BA/Lab renderizado.**

| Rota | Resultado |
|---|---|
| `/(app)/(ba)/(tabs)` | bloqueado → clínica |
| `/(app)/(lab)/(tabs)` | bloqueado → clínica |
| `/work` (aba do BA) | bloqueado → clínica |
| `/orders` (aba do Lab) | bloqueado → clínica |
| `/membership` (rota fora de tab) | bloqueado → clínica |

O guard no `_layout` do grupo cobre também rotas fora do `(tabs)`.

**C8b — aluno de estúdio (P4, lista `[]`):** `(clinica)` e `(ba)` bloqueados, cai no aviso do estúdio, URL estabiliza em `/module-select`, **sem loop de redirect**.

### Guard — abertura fria, spinner e loop

1. **Cache frio:** todo `browser_navigate` é page load completa (React Query vazio). Todos os deep links resolvem sem prender em spinner.
2. **Loop:** P1 entra em `(ba)` → guard → `/module-select` → auto-skip → `(clinica)` → guard aprova. Estabiliza. P4 (`[]`) → guard → `/module-select` → aviso. Estabiliza. Nenhum ping-pong.
3. **Sob erro do endpoint (500):** spinner durante os retries, depois a tela de erro. **Em nenhum momento o BA renderizou.**

### F4 — Erro do endpoint

Com o GET em 500: "We could not load your areas" + "Check your connection and try again." + botão "Try again". Restaurando o endpoint, o `refetch()` funciona e o app entra na área clínica. Screenshot: `t-2r-f4-erro-com-try-again.png`.

### Staff não quebrou (regressão extra, não pedida)

Admin → seletor com 3 módulos → BA abre; deep link para o Lab abre.

## Compilação e tipos

```
$ cd mobile && npx tsc --noEmit --ignoreDeprecations 6.0 | grep -iE "ModuleGuard|module-select|api/modules|store/module|_layout|Cannot find module"
(vazio)
$ npx tsc --noEmit | grep -v "^reconstruir/" | grep -iE "api/mobile/modules"
(vazio)
```

Erros pré-existentes do `mobile/` (`Card variant`, `SegmentedControl`, `membership.tsx`, `education/[id].tsx`) seguem inalterados e sem relação com a T-2.

## Achados

| # | Estado | Descrição |
|---|---|---|
| F1 | ✅ corrigido | `clinica` sumia ao conceder qualquer módulo |
| F2 | ✅ corrigido | Sem guard de rota — BA/Lab abriam por deep link |
| F4 | ✅ corrigido | Erro do endpoint caía em seletor vazio sem saída |
| F3 | 🔀 encaminhado | Endpoints de dado de Lab/BA sem gating → atividade **071** |
| F5 | 🟡 aberto | Dois `as any` no `router.replace` — limitação de typed routes do expo-router |
| F6 | ⚪ fora do escopo | `403 /api/exercises` sobe como erro de console; tela degrada bem |
| F7 | 🟡 tratado | `mod_clinica: false` isolado é ignorado pelo fallback — comentário do código corrigido para dizer a regra real |

### F7, em detalhe

```
mod_clinica=false (sozinho)        -> [clinica]   <- negação NÃO respeitada
mod_clinica=false + mod_ba=true    -> [ba]        <- respeitada
```

Com `mod_clinica: false` e nada mais concedido, `result` sai vazio e o fallback reinsere a clínica. **Não é bloqueador:** erra para o lado seguro (paciente fica com a própria área em vez de um app vazio) e negar a clínica a um paciente de clínica não é caso real. O comentário do código foi corrigido para declarar isso, em vez de prometer uma negação que só funciona acompanhada.

## Dados de teste

Postgres local `bpr_clinic_local`, tudo fictício (`@example.com`). Nenhum dado real tocado.

**Criados:** clinics `qa069-clinic-bare`, `qa069-clinic-cfg`, `qa069-studio-pt` (+ `qa069-clinic-bare2` na 1ª); users `qa069-p1@`, `qa069-p2@`, `qa069-admin@`, `qa069-student@`, `qa069-pt-admin@` (+ `qa069-super@`, `qa069-fullaccess@` na 1ª); linhas temporárias de `ClinicModuleAccess`; 21 `MobileRefreshToken`; 1 `BusinessProfile` gerado por GET (ver F3).

**Remoção confirmada:**

```
MobileRefreshToken removidos: 21
ClinicModuleAccess removidos: 1
Users removidos: 5 | Clinics removidas: 3
DEPOIS: users=0 clinics=0 businessProfiles=0
```

As 9 clínicas pré-existentes seguem intactas. `.env` copiado para o worktree foi removido; `.playwright-mcp/` removida; 0 processos node do worktree restantes.

**Alteração temporária em código:** `modules/route.ts` substituído por stub 500 para testar o F4 → restaurado, conferido por hash (`120d914736459450fbeb64a447c4c509` antes e depois).

## O que não foi testado

- **UI nativa (iOS/Android):** sem emulador confiável. Tudo rodou no alvo **Expo Web**, que o código declara suportar para teste. Não cobre deep link pelo scheme `bprrehab://` no SO, splash/ícone nativo, nem diferenças de navegação do expo-router no nativo. **Confirmar o bloqueio por `bprrehab://` quando houver build EAS** — é o vetor real em produção.
- **QA em produção:** só local. Após deploy, repetir C1, C4, C5b, C6 e C8.
- **C2 e C6** não reexecutados na 2ª rodada (filtro e auth não foram tocados).
- **Peso do bundle** (só a contagem de módulos foi comparada).
- **C10** é da T-3.


---

## Code review (22/09/2026, nivel high)

Sete achados. Seis viraram correcao; um e decisao operacional do Bruno.

| # | Severidade | Achado | Acao |
|---|---|---|---|
| 1 | media | `ModuleGuard` tratava `isError` como "sem direito" mesmo com `data` em cache. TanStack preserva `data` num refetch que falha, e o app tem `staleTime: 0` — toda montagem refaz a busca. Rede instavel expulsaria o paciente da area clinica. | ✅ decide pela ultima resposta do servidor; so recusa quando nao ha resposta nenhuma |
| 2 | media | Mesma raiz no `module-select`: o ramo `isError` vinha antes de usar `modules`, prendendo o usuario atras do "Try again" com dado valido em maos | ✅ `isError && !modules` |
| 3 | media | `THERAPIST` ficou fora do early-return de staff. `lib/tenant-access.ts:30` inclui `THERAPIST` em `STAFF_ROLES` e o login mobile nao filtra papel — terapeuta sem `ClinicModuleAccess` passaria a receber so `[clinica]`, perdendo Lab e BA | ✅ `THERAPIST` incluido |
| 4 | baixa | `ROUTE_MAP` cobre 3 chaves, mas a resposta do servidor nao era validada. App e API sobem separados: API antiga (ou rollback) devolve `treino`/`avaliacoes`/`nutricao`, `ROUTE_MAP[key]` fica `undefined` e o `router.replace` estoura sozinho dentro do efeito de auto-selecao | ✅ resposta filtrada por `key in ROUTE_MAP` |
| 5 | baixa | `moduleOverrides` e **tri-estado** (`lib/patient-access.ts:172-184`): `true\|"unlocked"` concede, `false\|"locked"` nega, `"hidden"` esconde. O endpoint lia como booleano, entao `"locked"` e `"hidden"` — strings truthy — **concediam** o modulo. Bug pre-existente no filtro original. | ✅ helper `overrideGrants()` com a semantica correta |
| 6 | baixa | A tela do aluno de estudio era beco sem saida: `module-select` e a unica rota alcancavel com lista vazia, entao ele nunca conseguiria sair da conta — nem para outra pessoa usar o aparelho | ✅ botao "Sign out" |
| 7 | baixa | **Sequenciamento de deploy** — ver abaixo | ⏳ decisao do Bruno |

O review tambem registrou, corretamente, que o `ModuleGuard` e **guarda de navegacao, nao fronteira de autorizacao**: os endpoints de dado de Lab e BA seguem respondendo a qualquer autenticado (atividade 071). O docstring do componente foi reescrito para dizer isso.

### Achado 7 — janela entre o deploy da API e o build EAS

O `return corsJson([])` para tenant personal entra em producao no push. A tela explicativa ("Your studio is getting its own app") so chega no proximo **build EAS**, que esta pendente. Na janela entre os dois, todo app ja instalado de aluno de estudio recebe lista vazia e cai no seletor antigo — zero cards, nenhuma explicacao.

Opcoes: mandar o build EAS antes do deploy da API, ou avisar o Emanuel e os alunos. **Pendente de decisao.**
