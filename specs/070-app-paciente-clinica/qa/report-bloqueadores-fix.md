# QA — correção dos três bloqueadores (atividade 070)

**Data:** 23/09/2026
**Branch:** `brunoto02028/app_clinic`
**Base:** relatório de QA de 23/09 (`c0c53f67`), que reprovou o app
**Ambiente:** backend deste worktree em `http://localhost:4010` · Expo Web em `http://localhost:8083`
**Paciente:** `maria.final.email@example.com` (fictícia) · clínica `bruno-physical-rehabilitation`

---

## Antes de tudo: o QA anterior mediu o servidor errado

O `:4000` que a rodada anterior usou como backend **não era este worktree** — era o
checkout principal (`C:\Users\bruno\Documents\clinic`, branch `main`):

```
PID 27364 → node C:\Users\bruno\Documents\clinic\node_modules\next\...\start-server.js
PID 20420 → expo start --web --port 8083  (este worktree)
```

Duas consequências:

1. **O CORS do agendamento foi medido contra o middleware do `main`**, que de fato
   não tem a correção. O diagnóstico do relatório (a ordem dos `return` no
   `middleware.ts`) estava **certo**; o que não dava para saber é que o servidor
   testado nunca teve o commit.
2. **O 404 de `/api/patient/clinical-notes` não é um bug da rota.** O corpo da
   resposta é HTML de erro do Next com este stack:
   `Cannot find module './38948.js'` vindo de
   `C:\Users\bruno\Documents\clinic\.next\server\webpack-runtime.js` — cache de
   webpack corrompido no **outro** checkout. Contra este worktree a rota
   responde **200**.

Toda a verificação abaixo roda contra um `next dev` deste worktree, na porta 4010,
com o Expo reiniciado apontando para ele.

---

## Veredito por bloqueador

| # | Bloqueador | Antes | Agora |
|---|---|---|---|
| 1 | CORS no agendamento | ❌ | ✅ corrigido e verificado |
| 2 | Idioma (11 de 20 telas em PT) | ⚠️ | ✅ 0 de 21 telas |
| 3 | Gate de plano (7 telas abertas) | ⚠️ | ✅ 4 restantes, todas deliberadas |
| 4 | Home com o gate fechado | ✅ | ✅ (+ barra e CTA removidas) |
| 5 | Agendar de ponta a ponta | ⚠️ | ✅ a tela deixou de oferecer dias fechados |
| 6a | `/profile` abre o módulo errado | ❌ | ✅ corrigido |
| 6b | Título duplicado em 8 telas | ❌ | ✅ 0 duplicados |
| 6c | CORS de `/api/wearables` | ❌ | ✅ corrigido |

---

## 1. CORS no agendamento — corrigido

A causa apontada pelo QA estava certa: `/api/public` está em `publicRoutes`, e o
`return` dos públicos (`middleware.ts:282`) acontece antes do bloco que injeta o
cabeçalho (`:293`). O preflight passava; o GET real, não.

A correção injeta o cabeçalho **no próprio return dos públicos**, quando a rota
também é uma rota mobile:

```ts
if (matchesRoute(pathname, publicRoutes)) {
  if (isMobileApiPath(pathname)) {
    const res = NextResponse.next();
    res.headers.set('Access-Control-Allow-Origin', MOBILE_CORS_ORIGIN);
    return res;
  }
  return NextResponse.next();
}
```

Verificado contra `:4010`, com bearer real:

```
ROTA                                                     STATUS CORS
/api/public/schedule?clinic=bruno-physical-rehabilitation 200    *
/api/wearables/connections                               200    *
/api/patient/clinical-notes                              200    *
/api/patient/access                                      200    *
/api/patient/tasks                                       200    *
```

`/api/wearables` entrou no `MOBILE_API_PREFIXES` junto — era o achado 6c.

### O efeito colateral que o CORS sozinho não resolve

Com o cabeçalho no lugar a chamada passa, mas neste banco
`/api/public/schedule` devolve `{"schedule":[]}` — a clínica não tem nenhum
usuário com `bookable: true`. Com `closedDays` vazio a tela continuava
oferecendo os 14 dias.

A tela agora distingue "a clínica fecha neste dia" de "não sei quando a clínica
abre", e no segundo caso diz o mesmo que a web:

> **No available dates at the moment. Please contact the clinic.**

Evidência: `fx-final-book-appointment.png`.

---

## 2. Idioma — 0 de 21 telas com português para paciente `en-GB`

Varredura automatizada das 21 telas, contra 40 termos portugueses:

```
--- fim ---   (nenhuma ocorrência)
```

### O achado mais grave está fechado

`screening.tsx` não chamava `useLang()` em lugar nenhum e pegava o lado
português à força em dois campos que o servidor entrega nos dois idiomas:

- `:114` `config?.consentText?.pt` → `pick(lang, en, pt)`
- `:323` `{q.pt}` → `{pick(lang, q.en, q.pt)}`

Percorrendo o wizard inteiro como `en-GB`:

```
step 0  Assessment | Profile | 1 / 9
step 7  Assessment | Red flags | 8 / 9
step 8  Assessment | Consent | 9 / 9
```

**Red flags (todas as 12, em inglês):**
> Have you experienced unexplained weight loss recently?
> Do you experience severe pain at night that disrupts your sleep?
> Are you experiencing numbness, tingling, pins and needles, or weakness…?
> …

**Consentimento (em inglês):**
> I confirm that the information provided is accurate to the best of my
> knowledge. I consent to the storage and processing of this health information
> for the purpose of my rehabilitation treatment in accordance with UK GDPR
> regulations.

E o contador: `12 safety questions are still unanswered. Go back a step before submitting.`

Evidências: `fx-en-screening-step7.png`, `fx-en-screening-step8.png`.

### As 8 telas que o script de tradução não tinha tocado

`screening`, `guide`, `outcome-measures`, `wearables`, `wearable-data`,
`quizzes`, `education/[id]`, `booking-confirmed` — todas passadas por `t()`/`pick()`.

### Os 2 helpers compartilhados

- `lib/appointment-status.ts` — as 6 labels do enum eram PT fixo. Agora
  `getStatusStyles(t, lang)`; os 2 chamadores passam `lang`. A lista mostra
  **Pending / Completed** para `en-GB`.
- `tasks.tsx` — o ternário inglês tinha `"pending" : "pending"` nos dois ramos.

### A direção oposta (paciente `pt-BR`)

Varredura equivalente contra 40 termos ingleses. Restaram dois, ambos corrigidos
ou legítimos:

- **`/profile`** exibia os 14 itens do menu em inglês sob uma home em português.
  `ProfileSection.title` virou `{ en, pt }` e `ModuleProfile` passou a traduzir
  também "Edit profile", "Notifications", "Change password", "Switch module",
  "Sign out".
- **`/treatment-protocol`**: "High-load plantar-fascia strengthening" é conteúdo
  clínico escrito pelo terapeuta, não string de UI. Fica.

A home inteira estava em inglês fixo e agora responde ao idioma:

```
Saúde | Nenhuma sessão agendada | Agende sua próxima sessão para manter o ritmo.
Agendar sessão | SEU PLANO | 2 exercícios hoje | Começar os exercícios de hoje
Evolução da dor | Agendar nova sessão | Meu prontuário | Falar com a clínica
Início | Consultas | Exercícios | Perfil
```

### Outros acertos de idioma

- `notifications.tsx` usava `notif.titlePt || notif.title` — a forma que
  `lib/i18n.ts` documenta como proibida. Agora `pick()`.
- `documents.tsx:168` chamava `formatDate()` sem `lang`, então um paciente pt-BR
  via datas em formato inglês.
- `book-appointment.tsx` formatava a data da confirmação com `"en-US"` fixo.
- `clinical-notes.tsx` — o PT dizia "Documentação SOAP das suas consultas",
  jargão interno que o inglês evita de propósito. Os dois dizem o mesmo agora.
- Acentos restaurados em ~20 strings (`Nao`, `possivel`, `Series`, `Repeticoes`,
  `incluido`, `clinica`…) — resíduo de edição por script.

---

## 3. Gate de plano

Com `fullAccessOverride: false`, `/api/patient/access` concede
`mod_dashboard, mod_profile, mod_plans, mod_consent, mod_guide, mod_screening`.

**11 telas trancam** (`len=103` = só o cartão de bloqueio): appointments,
exercises, tasks, documents, treatment-protocol, clinical-notes,
**outcome-measures**, education, **daily-checkin**, **quizzes**, book-appointment.
As três em negrito são novas nesta rodada.

Gates adicionados, cada um com a chave que o produto já define:

| Tela | Módulo | Por quê |
|---|---|---|
| `outcome-measures` | `mod_records` | a web chega nesses scores por My Records; o app não só mostrava como deixava **gravar** |
| `daily-checkin` | `mod_journey` | o sidebar da web nomeia o check-in de dor como parte da Journey |
| `quizzes` | `mod_quizzes` | o registry aponta essa chave direto para `/dashboard/quizzes` |
| `assessment-progress` | `mod_screening` | todo passo que ele acompanha é da avaliação |

`assessment-progress` continua abrindo com o gate fechado — **correto**, porque
`mod_screening` está concedido nesse cenário.

### As 3 que continuam abertas, de propósito

`messages`, `wearables`, `wearable-data`. Nenhum módulo do `MODULE_REGISTRY`
governa essas telas, e a web também não as gateia — o próprio
`patient-sidebar.tsx:171` comenta *"nothing governs it (e.g. Messages)"*.
Trancar no app deixaria o app mais restritivo que a web, que é exatamente a
divergência que este gate existe para eliminar. Ver **Pendente de decisão**.

---

## 4. Home com o gate fechado

```
Health
No upcoming sessions
Book your next session to stay on track.
Book a session
YOUR PLAN
Not included in your plan
📈 Pain trend …
```

Nenhum número, **e** as duas ressalvas visuais do relatório anterior caíram: a
`TriBar` com dois de três segmentos preenchidos e o botão verde
"Start today's exercises" agora só aparecem quando há contagem real.

O texto do botão também deixou de ser inglês fixo.

---

## 5. Regressões do relatório anterior

### 6a — `/profile` abria o módulo BA

Três arquivos resolvem para `/profile` (`(ba)`, `(clinica)`, `(lab)`) e o router
escolhia o primeiro. É a mesma ambiguidade que congelou o logout em `/`. Os três
`path` do guide passaram a ser qualificados:

```
/(app)/(clinica)/(tabs)/profile
/(app)/(clinica)/screening
/(app)/(clinica)/(tabs)/appointments
```

Com o perfil certo aberto, o menu mostra os **13** itens da clínica.

### 6b — Título duplicado

Regra aplicada: **o header da navegação nomeia a tela; o corpo não repete**.
Corrigido em tasks, documents, clinical-notes, messages, outcome-measures,
wearables, wearable-data, treatment-protocol, screening, assessment-progress,
book-appointment, notifications.

Varredura das 21 telas por linhas consecutivas idênticas:

```
titulos duplicados restantes: nenhum
```

Junto caiu o problema dos três nomes para a mesma tela: a tab bar dizia
"Sessions", o header "Appointments" e o PT "Agenda". Agora é
**Appointments / Consultas** nos três lugares, e as 4 abas ficaram bilíngues.

### 6c — `/api/wearables` redirecionava o preflight

`/api/wearables` entrou no `MOBILE_API_PREFIXES`. O OPTIONS devolve 204 com
cabeçalho e o GET responde 200. Com isso, **Devices** voltou ao menu do perfil —
a entrada tinha sido segurada no commit anterior justamente por causa dessa
linha de middleware.

---

## 6. Estado final

**21/21 telas** carregam, com `err=0` e `net=0` em todas, nas duas línguas e nos
dois estados do gate. Nenhuma exceção JavaScript.

```
[home] / len=388 err=0 net=0
[appointments] /appointments len=309 err=0 net=0
…
[notifications] /notifications len=402 err=0 net=0
```

`npx tsc --noEmit` no `mobile/`: **21 erros**, exatamente o baseline anterior —
nenhum novo. (O primeiro `<Card variant="highlight">` que escrevi virou
`accent="health"` ao descobrir que `variant` não existe em `CardProps`.)
`middleware.ts`: **0 erros**.

### Banco restaurado

```
maria: preferredLocale= en-GB   fullAccessOverride= true
admin@bpr.rehab: bookable= false
```

---

## Pendente de decisão (não executado)

1. **Escopo de tenant: notas × documentos.** `/api/patient/clinical-notes`
   filtra `clinicId ∈ {minha, null}` e mostra 2 das 4 notas da Maria; as outras
   2 estão carimbadas com outro `clinicId`. Os **4 documentos** dela têm esse
   mesmo `clinicId` "errado" e **aparecem todos**, porque a rota de documentos
   não filtra por clínica. A web mostra as 4 notas. Duas rotas do mesmo
   paciente, dois critérios. Não é vazamento — a query é `patientId = eu` — mas
   é preciso escolher qual das duas está certa.

2. **`perm_chat_therapist` não é aplicado em lugar nenhum.** A permissão existe
   no registry e a tela de permissões a oferece, mas nem a web nem a API nem o
   app a consultam. Se ela deve valer, é ela que gateia `/messages`.

3. **Nenhum terapeuta agendável.** Neste banco `admin@bpr.rehab` tem
   `bookable: false`, então `/api/public/schedule` e `/api/availability` não
   têm o que devolver. **Conferir em produção antes de liberar** — sem isso o
   paciente vê "No available dates" mesmo com tudo funcionando.

4. **`<Card variant="highlight">` não faz nada.** `CardProps` aceita `accent`,
   não `variant`. Há 11 ocorrências pré-existentes, em telas que deveriam
   aparecer destacadas e renderizam planas. Fora do escopo desta rodada.

5. **Cache de webpack corrompido em `C:\Users\bruno\Documents\clinic`.** O
   `next dev` de lá está servindo 500 em várias rotas. `rm -rf .next` resolve,
   mas é outra sessão — não toquei.
