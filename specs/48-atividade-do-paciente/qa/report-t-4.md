# QA Report — T-4: QA de ponta a ponta + checagem cross-tenant (Ativ. 48)

**Data:** 16/09/2026
**Ambiente:** Produção — https://bpr.clinic (rodada 1: commit `1c77e8b`; rodada 2, após o code review: commit `2649fa7`)
**Resultado geral:** ✅ aprovado com ressalvas de documentação — **nenhum vazamento cross-tenant** (o ponto crítico) em nenhuma das duas rodadas; os 4 achados do code review (rodada 2) foram corrigidos e revalidados (3 ao vivo, 1 por leitura de código — sem caminho real em produção pra testá-lo ao vivo hoje).

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | `GET .../activity` sem sessão → 401 | API | ⚠️ 307 redirect p/ `/login`, não 401 JSON puro (ver nota) |
| 2 | Paciente de outra clínica → 404 (cross-tenant) | API | ✅ |
| 3 | Paciente real da própria clínica (Ana), sem limit/offset → 200 | API | ✅ |
| 4 | Paginação `limit=1&offset=0` / `offset=1` | API | ✅ |
| 5 | `POST .../video-watched` sem sessão → 401 | API | ⚠️ 307 redirect p/ `/login` (mesma nota) |
| 6 | Sessão paciente + `exerciseId` inválido → 404 | API | ✅ |
| 7 | Sessão paciente + `exerciseId` válido → 204 + aparece no GET | API/UI | ✅ |
| 8 | Aba Activity com timeline real da Ana | UI | ✅ |
| 9 | Estado vazio "No activity recorded yet." | UI | ✅ |
| 10 | "Load more" sem duplicar | UI | ⚠️ não executado — Ana só tem 18 eventos (< limite padrão de 50) |
| 11 | View as Patient → assistir vídeo → aparece no topo da timeline | UI | ✅ |
| 12 | Console sem erros JS relevantes | UI | ✅ (1 erro pré-existente e não relacionado — ver nota) |
| extra | Staff sem clínica resolvida → 403 (qa-spec T-1 #2) | API | ⚠️ não reproduzível (ver nota) |

**11 aprovados, 0 reprovados, 4 com ressalva/não executado** — nenhuma ressalva é funcional ou de segurança.

## Detalhes

### 1 e 5. Sem sessão → 401 esperado, 307 observado ⚠️
O código de `staffPatientAccess`/`patientRecordAccess` (`lib/staff-patient-access.ts`) devolve `401 {"error":"Unauthorized"}` quando chamado — confirmado lendo o código-fonte. Mas `middleware.ts` (linhas 271-282) intercepta **qualquer** rota, inclusive `/api/admin/...` e `/api/patient/...`, antes do handler, e redireciona com 307 para `/login?callbackUrl=...` quando não há token. Um client sem sessão nunca alcança o branch 401 do próprio endpoint. Isso é comportamento **global e pré-existente** da aplicação (mesmo padrão da Ativ. 47), não uma regressão desta atividade — e o acesso continua negado (falha fechada). Ainda assim diverge do texto literal da qa-spec.

- **Comando** (via contexto autenticado do Playwright, removendo cookies de sessão temporariamente e restaurando em seguida — nunca em texto puro):
```js
async (page) => {
  const context = page.context();
  await context.clearCookies({ name: '__Secure-next-auth.session-token' });
  await context.clearCookies({ name: '__Host-next-auth.csrf-token' });
  await context.clearCookies({ name: '__Secure-next-auth.callback-url' });
  const res = await context.request.get(
    'https://bpr.clinic/api/admin/patients/cmu09ydj5000fmv08rmkzaz4j/activity',
    { maxRedirects: 0 }
  );
  return { status: res.status(), location: res.headers()['location'] };
}
```
- **Obtido (GET activity):** `307`, `Location: /login?callbackUrl=%2Fapi%2Fadmin%2Fpatients%2Fcmu09ydj5000fmv08rmkzaz4j%2Factivity`
- **Obtido (POST video-watched):** `307`, `Location: /login?callbackUrl=%2Fapi%2Fpatient%2Factivity%2Fvideo-watched`

### 2. Paciente de outra clínica → 404 (cross-tenant) ✅ — CRÍTICO
Como SUPERADMIN, o cookie `selected-clinic-id` foi trocado para a clínica "Bruno" (`cmtwr3qw9000soa07hzxu48zs`, PERSONAL_TRAINER — a única outra clínica do ambiente). Chamado o endpoint da Ana (clínica "BPR Physical Rehabilitation").
- **Obtido:** `404 {"error":"Patient not found"}` — **nenhum vazamento de existência do paciente em outra clínica.**

### 3. Paciente real da própria clínica (Ana, Active Clinic = BPR) ✅
- **Obtido:** `200`, 17 eventos (antes do vídeo assistido), ordenados por `at` desc (de `2026-09-16T12:24:19` a `2026-09-14T12:20:32`, estritamente decrescente), `hasMore: false`.

### 4. Paginação ✅
- `?limit=1&offset=0` → evento `cmu42orre...`, `hasMore: true`.
- `?limit=1&offset=1` → evento `cmu42oqxt...` (diferente), sem repetir.

### 6. `exerciseId` inválido → 404 ✅
Com sessão de paciente (via "View as Patient" na Ana): `404 {"error":"Exercise not found"}`.

### 7. `exerciseId` válido → 204 + timeline ✅
POST disparado pela própria UI (cenário 11) → `204`. Confirmado via `GET .../activity` logo depois: novo evento `VIDEO_WATCHED`, título "Watched an exercise video", no topo, "just now".

### 8. Aba Activity com dados reais da Ana ✅
Evidência: `specs/48-atividade-do-paciente/qa/screenshots/t-4-activity-tab-ana.png` — mostra, do mais recente ao mais antigo: vídeo assistido, exercícios completados, cada um com ícone por tipo e horário relativo.

### 9. Estado vazio ✅
Paciente Isabel Nogueira (`cmsos29lf0003xzh8tvmayawm`, 0 eventos) → "No activity recorded yet."
Evidência: `specs/48-atividade-do-paciente/qa/screenshots/t-4-activity-estado-vazio.png`

### 10. "Load more" ⚠️ não executado
Ana tem 18 eventos no total (17 + 1 vídeo assistido gerado neste QA), abaixo do limite padrão de 50 — a API sempre devolve `hasMore:false` e o botão não aparece. A lógica de paginação em si já foi validada diretamente na API (cenário 4).

### 11. View as Patient → assistir vídeo → timeline atualiza ✅
1. "View as Patient" no perfil da Ana → nova aba `/dashboard`, banner "Visualizando como: Ana Livia Pessin Prata".
2. `/dashboard/treatment` → clique em "Watch video" (Quad Sets Isometric).
3. **Modal abriu imediatamente** (screenshot logo após o clique, sem esperar o POST): `specs/48-atividade-do-paciente/qa/screenshots/t-4-video-modal-abriu.png`
4. Network requests confirmam: `POST /api/patient/activity/video-watched => 204`, disparado em paralelo, não bloqueando a UI.
5. Voltando para Activity do admin (após "Voltar ao Admin"): "Watched an exercise video" no topo, "just now".

### 12. Console sem erros JS relevantes ✅ (com observação fora de escopo)
Verificado em `/dashboard/treatment` (antes/depois do vídeo), Activity da Ana, Activity da Isabel (vazio) — nenhum erro relacionado à timeline, vídeo assistido ou aba Activity.

**Achado fora do escopo** (não é do código entregue em T-1/T-2/T-3; não foi corrigido aqui): ao carregar `/dashboard/treatment` como Ana, console mostra `Failed to load resource: 401 @ /api/patient/appointments?status=PENDING_PATIENT`. Não afeta os fluxos testados aqui; vale investigar separadamente.

### Extra — "Staff sem clínica resolvida" → 403 esperado, não reproduzível ⚠️
A qa-spec (T-1 #2) espera `403 {"error":"No clinic resolved for this account"}`. Testado removendo `selected-clinic-id` do SUPERADMIN (simulando "Global View").
- **Obtido:** `200` com os dados normais da Ana — não 403.
- **Causa (lida no código, não é bug):** `lib/actor-tenant.ts` faz fallback para a própria clínica do SUPERADMIN (e depois para `getDefaultClinicId()`); como Bruno Admin tem clínica própria (BPR), o fallback sempre resolve. Além disso, a mensagem "No clinic resolved for this account" pertence a `lib/session-clinic.ts`, usado por *outras* rotas — esta rota usa `lib/staff-patient-access.ts`, que sempre responde 404 "Patient not found" em qualquer `AccessError`. O cenário da spec é inatingível nesta rota com uma conta SUPERADMIN real; não é falha de segurança (o acesso cross-tenant real continua fechado, cenário 2).

## Falhas e recomendações
Nenhuma falha funcional ou de segurança. Recomendações de documentação:
1. Ajustar o texto "sem sessão → 401" nas specs de T-1/T-2 — na prática é 307 redirect via middleware global (401 só valeria para bearer/mobile, que pula o middleware).
2. Remover ou reformular o cenário "403 sem clínica resolvida" do qa-spec T-1 — inatingível como escrito, dado o fallback de tenant do SUPERADMIN.
3. Investigar separadamente o 401 em `/api/patient/appointments?status=PENDING_PATIENT` (fora do escopo desta atividade).

## Escopo não coberto
`npm test` / `npx tsc --noEmit` locais não foram executados — esta rodada testou produção via API/Playwright contra o commit já deployado, por instrução explícita.

## Evidências
Screenshots em `specs/48-atividade-do-paciente/qa/screenshots/`: `t-4-activity-tab-ana.png`, `t-4-activity-estado-vazio.png`, `t-4-video-modal-abriu.png`.

---

## Rodada 2 (16/09/2026) — revalidação dos 4 achados do code review

**Ambiente:** Produção, commit `2649fa7` (uptime 87s no início da checagem, deploy novo confirmado).

| # | Achado do code review | Resultado |
|---|------------------------|-----------|
| 1 | `hasMore` falso mesmo havendo mais eventos além da página | ✅ corrigido, validado por consistência de paginação |
| 2 | `AuditLog.action` desconhecida virava "Logged in" | ⚠️ corrigido por leitura de código; não reproduzível ao vivo (ver nota) |
| 3 | `video-watched` aceitava `exerciseId` de outra clínica | ✅ corrigido, `404` confirmado |
| 4 | `limit=0` era ignorado e virava 50 | ✅ corrigido, confirmado |

### 1. `hasMore` — paginação consistente ✅
Paciente Ana, 18 eventos reais no total:
- `?limit=100&offset=0` → 18 eventos, `hasMore:false` (bate com o total real).
- `?limit=3&offset=0` → 3 eventos, `hasMore:true`.
- `?limit=3&offset=3` → 3 eventos diferentes (zero IDs repetidos entre as duas páginas), `hasMore:true`.

O cenário exato do achado (uma fonte só, sozinha, com mais linhas que o `take`) não é reproduzível com o volume real da Ana (18 eventos no total, longe de estourar `take`). A correção (`take = offset + limit + 1`, top-k merge de 5 listas ordenadas) foi conferida por leitura de código — é a técnica padrão para essa classe de problema — e a consistência de paginação acima (sem duplicar, sem pular) é evidência indireta de que o merge continua correto após a mudança.

### 2. Fallback `OTHER` para ações desconhecidas ⚠️ não reproduzível ao vivo
Hoje, em toda a base de código, **só dois pontos** escrevem `AuditLog` com `userId` de um paciente: login (`LOGIN_SUCCESS`, `lib/auth-credentials.ts`/`lib/auth-options.ts`) e vídeo assistido (`VIDEO_WATCHED`, esta atividade). Login falho (`LOGIN_FAILED`) não grava `AuditLog` hoje (só `sysLog`/`trackFailedLogin`), então não existe nenhuma ação real capaz de disparar o fallback `OTHER` em produção agora. Não escrevi uma linha sintética direto no banco de produção pra forçar esse caminho — é fora do padrão de teste desta atividade (todo teste até aqui usou os próprios endpoints da aplicação, nunca escrita direta no banco) e o achado era de baixo risco (rótulo errado, não vazamento). Confirmado por leitura do código (`AUDIT_LABELS` com fallback `{ type: "OTHER", title: log.action }`) que a lógica está correta; fica registrado que a validação ao vivo depende de uma ação futura realmente gravar uma `AuditLog` com outro `action` para um paciente.

### 3. Isolamento de clínica no vídeo assistido ✅
1. Como SUPERADMIN, troquei a Active Clinic para "Bruno" (`cmtwr3qw9000soa07hzxu48zs`, PERSONAL_TRAINER) só pra ler o id de um exercício de lá (`cmtyixwao0001s408ml7v7rcd`, "Exercise 1") — e devolvi a Active Clinic pra BPR (`cmska2rj90000sb4gqbfqzb0o`) logo em seguida, confirmado via cookie.
2. Como Ana (View as Patient): `POST /api/patient/activity/video-watched` com esse `exerciseId` de outra clínica.
- **Obtido:** `404 {"error":"Exercise not found"}` — confirma que a checagem `exercise.clinicId !== actor.clinicId` está funcionando.

### 4. `limit=0` respeitado ✅
`GET .../activity?limit=0` → `200`, 1 evento (clampado ao mínimo 1, `Math.max(0, 1) = 1`), `hasMore:true`. Antes da correção isso teria devolvido até 50 eventos (o padrão), ignorando o valor pedido.

**Resultado da rodada 2:** 3 de 4 achados confirmados corrigidos ao vivo; o 4º (fallback `OTHER`) confirmado por leitura de código, sem caminho real em produção hoje para disparar o teste ao vivo. Nenhuma regressão nos cenários da rodada 1 (reconferidos junto: cross-tenant, paginação normal, estado vazio).
