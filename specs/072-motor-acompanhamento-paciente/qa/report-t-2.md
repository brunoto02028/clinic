# QA — T-2: `Alert` + central de alertas do terapeuta

**Data:** 23/09/2026 · **Branch:** `brunoto02028/motor_acompanhamento` · **Commit:** `ab312b3c`
**Ambiente:** Next dev `:4000` + build de produção isolado `:4200` · Postgres `bpr_clinic_local`
**Resultado: REPROVADO** (corrigido depois; ver `report-t-2-recheck.md`)

> Modelo, idempotência e API estão sólidos: o isolamento entre clínicas passou nos dois sentidos, o
> dedupe aguenta corrida, ack/resolve gravam ator e horário. **O que reprova é o passo 4 da
> tarefa:** a tela e o contador **não são alcançáveis por nenhum usuário de staff**. O terapeuta
> nunca vê a central — que é a razão de a tarefa existir.

## Resumo

| # | Cenário | Resultado |
|---|---|---|
| 0 | `prisma migrate diff` sem `DROP` | ✅ |
| 2.1 | Terapeuta da A vê só alertas da A | ✅ |
| 2.2 | Alerta da B por id, como staff da A → 404 e dado intacto | ✅ |
| 2.3 | Paciente → 403 | ✅ |
| 2.4 | Sem token → 401 | ⚠️ devolve **307** (plataforma, não T-2) |
| 2.5 | Dedupe, inclusive em corrida | ✅ |
| 2.6 | "Ciente" grava quem e quando | ✅ |
| 2.7 | "Resolvido" idem | ✅ |
| 2.8 | Ordenação URGENT > HIGH > MEDIUM > LOW | ✅ |
| 2.9 | Nenhum envio ao paciente | ✅ |
| — | **Staff alcança a tela** | ❌ **B1** |
| — | **Contador onde o staff olha** | ❌ **B2** |
| — | Paciente não alcança tela de staff | ❌ **B3** |
| — | Vazio × falha visivelmente diferentes | ✅ |
| — | Inglês canônico + PT | ✅ |
| — | Entrada inválida no PATCH | ✅ |
| — | Filtro inválido | ⚠️ **F5** |
| — | "Ciente" em alerta resolvido | ⚠️ **F4** |

## Bloqueadores

### B1 — a central não é alcançável por staff

A tela foi criada em `app/dashboard/alerts/page.tsx`. O middleware manda todo staff que pedir
`/dashboard/*` para `/admin/*` — e `/admin/alerts` não existe.

```
307 /dashboard/alerts  →  404 /admin/alerts   ("This page could not be found")
```

**Não é o bug de colisão de chunk.** Build de produção limpo em `distDir` isolado, servido na
`:4200`: comportamento idêntico. Três provas:

1. O manifesto do build lista `ƒ /dashboard/alerts`, `ƒ /api/alerts`, `ƒ /api/alerts/[id]` — e
   **não** lista `/admin/alerts`.
2. `ls app/admin/alerts/` → não existe.
3. A mesma URL devolve **200 e renderiza a central inteira** para quem o middleware deixa passar
   (B3). Colisão de chunk quebraria a rota para todo mundo.

Origem: `middleware.ts`, bloco `/dashboard` — depois de `EXACT_MAP` e `PREFIX_MAP` vem o default
`/dashboard/X → /admin/X`.

### B2 — o contador também não é alcançável

O contador foi para `components/dashboard/therapist-dashboard.tsx`, renderizado só por
`app/dashboard/page.tsx` — e staff pedindo `/dashboard` cai no `EXACT_MAP` (`'/dashboard': '/admin'`).

```
cadeia: 307 /dashboard → 200 /admin
"open alert" na página? NÃO     chamou /api/alerts? nenhuma chamada
links com "alert" na navegação do /admin: NENHUM
```

Com 4 alertas abertos, a home do terapeuta não mostrou nada e nem consultou a API. E não há **nenhum
link** para alertas no menu do `/admin`: mesmo resolvendo B1, ninguém descobriria a tela.

### B3 — o paciente abre a tela de staff

`/dashboard/alerts` devolve **200** para sessão PATIENT e renderiza a central dentro do portal do
paciente. **Nenhum dado vaza** (a API responde 403 e a tela cai no estado de falha), mas o paciente
vê uma tela interna de staff dizendo "não foi possível carregar os alertas".

## O que passou, e como

### Isolamento (2.1, 2.2)

```
GET /api/alerts  como terapeuta da A  → 200, 3 ids, nenhum da B    openCount: 3
PATCH alerta da B, como staff da A    → 404 {"error":"Alert not found"}

ANTES : {"status":"OPEN","ackById":null,"resolvedById":null,"updatedAt":"...:50.265Z"}
DEPOIS: {"status":"OPEN","ackById":null,"resolvedById":null,"updatedAt":"...:50.265Z"}
```

O `updatedAt` não se mexeu — a linha não foi tocada nem parcialmente. É o `updateMany` com
`clinicId` na mesma cláusula, em vez de ler-e-conferir, que garante isso. O inverso também foi
conferido.

### Idempotência (2.5)

```
sequenciais:      created true → false, mesmo id, 1 linha
Promise.all ×5:   [false,true,false,false,false] → 1 linha, 1 id
janela nova:      created = true     outro paciente: created = true
```

Exatamente um `created:true` entre cinco concorrentes — a unicidade é resolvida no banco, não numa
checagem de aplicação.

### Ordenação (2.8)

O `MEDIUM` foi criado de propósito como **o mais recente**, para que a ordem não pudesse ser
confundida com ordenação por data:

```
1. URGENT (08:30)  2. HIGH (08:30)  3. MEDIUM (08:46 ← o mais novo)  4. LOW (08:30)
```

A prioridade manda; a data só desempata.

### Nenhum envio (2.9)

`PatientOutboundEmail`, `WhatsAppMessage`, `EmailMessage`, `JourneyNotification`, `RehabMessage`,
`ClinicMessage`, `StudyMessage`, `EmailCampaignJob` — contagens idênticas antes e depois.

### Vazio × falha

O erro que o app do paciente cometeu em cinco telas **não** se repete:

| Vazio (200, lista vazia) | Falha (500) |
|---|---|
| check verde | nuvem cortada |
| "Nothing needs your attention." | "We could not load the alerts." |
| "Alerts appear here when a rule fires." | "This does not mean there are none — the request failed." |
| sem botão | botão "Try again" |

O componente guarda `failed` e `rows` separados e zera `rows` no erro, em vez de cair numa lista
vazia.

## Ressalvas

### F4 — "Ciente" desfaz um "Resolvido"

```
PATCH {"action":"acknowledge"} num alerta RESOLVED → 200
BANCO: {"status":"ACKNOWLEDGED","resolvedById":"...","resolvedAt":"..."}
```

Linha contraditória: status "ciente" com carimbo de resolução. Pela tela não dá para chegar nisso
(o botão some), mas a API aceita — e a T-3 vai chamar essa rota programaticamente.

### F5 — filtro inválido ignorado em silêncio

`?status=BANANA` → 200 com todos os alertas, como se não houvesse filtro.

### F6 — o dedupe nunca escala a prioridade

```
1ª: LOW "Primeira" | 2ª: URGENT "Segunda"  →  banco: {"title":"Primeira","priority":"LOW"}
```

Está de acordo com a spec ("um alerta só"), então não conta como falha. Mas quando a T-3 tiver regra
que piora dentro da mesma janela — aderência caindo de 40% para 5% — o alerta continuaria `LOW` com
os números velhos.

### 2.4 e F7 — 307 no lugar de 401, e o app não alcança a rota

Sem token, `/api/alerts` devolve `307 → /login`. O ramo `401` nunca executa. **Não é de T-2:**
comportamento idêntico em `/api/dashboard/stats`, `/api/patients`, `/api/clinical-notes`,
`/api/appointments`. Origem no `middleware.ts` (`if (!token) redirect(loginUrl)`, sem tratamento
para `/api`). `/api/alerts` também não está em `MOBILE_API_PREFIXES` — para o paciente é desejável;
para um eventual app do terapeuta, é limite conhecido.

## Como a tela foi testada

Por causa de B1, nenhum staff chega em `/dashboard/alerts` pelo navegador. A página foi servida na
sessão que o middleware deixa entrar, com **toda** chamada a `/api/alerts*` interceptada e refeita
contra o mesmo servidor com o cookie do terapeuta, devolvendo a resposta real.

Componente real, API real, banco real, ator real — `ackById`/`resolvedById` conferidos no banco como
o id do `qa.fisioa`. **Não coberto:** a navegação até a tela (que é B1) e o shell/menu.

## Recomendação

Não marcar T-2 como concluída. A API e o modelo passaram em tudo que a spec pede deles; **falta a
tarefa chegar ao terapeuta**, que é a razão de ela existir.

1. **B1 + B2 + B3 são uma decisão só:** mover a central para `app/admin/alerts/`, o contador para
   `app/admin/page.tsx` e acrescentar a entrada no menu.
2. **F4** antes de a T-3 chamar a rota programaticamente.
3. **F6** é decisão de produto, junto com o desenho das regras da T-3.
4. **F5** e 2.4/F7 quando der; nenhum expõe dado.

Depois de 1 e 2, refazer 2.6, 2.7 e 2.8 **pela navegação real do staff**.

## Notas de ambiente

- Login instável no dev: `qa.admina` não logou em 3 tentativas (CSRF do NextAuth); a senha está
  certa (conferida com `bcrypt.compare`). Sem relação com T-2.
- SUPERADMIN sem clínica selecionada (`actor.clinicId` nulo → 403) não foi testado — não há conta
  SUPERADMIN entre os usuários de teste.
- Nenhum arquivo de código ou schema foi modificado pelo QA.
