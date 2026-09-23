# QA — T-12 (triagem e consentimento) e T-15 (agendamento)

**Data:** 22/09/2026 · **Branch:** `brunoto02028/app_clinic` em `ace737df` (nada testado mudou até `42ae7fe2`)
**Ambiente:** Next dev :4000 · Expo Web :8083 (`EXPO_PUBLIC_API_URL=http://localhost:4000`) · Postgres `bpr_clinic_local`
**Veredito:** T-12 ❌ **REPROVADA** · T-15 ❌ **REPROVADA**

Os 10 cenários pedidos (C1–C10) passaram. As reprovações vêm de 4 cenários que o QA derivou além deles.

## Em uma linha

- **T-12:** a correção do UPDATE funciona e protege os dados da web. Mas uma paciente **nova** ainda envia pelo app uma triagem com as 12 red flags gravadas como "Não" sem nunca ter respondido. Reproduzido de ponta a ponta na UI.
- **T-15:** a conversão de fuso está certa e bate com a web no banco. Mas o **app não consegue gravar agendamento nenhum** — `POST /api/appointments` recusa o token do app com 401. Bloqueio anterior à tarefa, idêntico no `main` e portanto **em produção**.

## Resumo

| # | Cenário | Resultado |
|---|---|---|
| C1 | Autosave do app preserva red flags e textos preenchidos na web | ✅ |
| C2 | Enviar sem consentimento: botão desabilitado, nada gravado | ✅ |
| C3 | Enviar com consentimento e 12 respondidas: valores reais no banco | ✅ |
| C4 | `smoker` = Fumante grava `true`, sem erro | ✅ |
| C5 | `consent.tsx`: não aceito / aceito, sem data inventada | ✅ |
| C6 | Regressão web: `false` explícito é gravado | ✅ (camada de dados; UI web não executada) |
| **C11** | Paciente nova: o 1º autosave grava 12 "Não" | ❌ |
| **C12** | Voltando ao rascunho, o envio é liberado sem responder | ❌ |
| C7 | 23/09 09:00 (BST) grava 08:00Z; app == web | ✅ |
| C8 | 15/12 09:00 (GMT) grava 09:00Z; app == web | ✅ |
| C9 | Confirmação mostra a clínica da paciente | ✅ (tela aberta direto — ver C13) |
| C10 | Nenhum endereço inventado; sem "Directions" nem "Add to calendar" | ✅ |
| **C13** | O app consegue gravar um agendamento | ❌ 401 |
| **C14** | Card "Your triage is done — Sent" na confirmação | ❌ fixo no código |

---

## T-12

### C1 — autosave preserva os dados da web ✅

A primeira tentativa foi inválida: a triagem salva pela web ficou `isLocked: true`, e todo autosave depois voltou `reason: "locked"` — quem protegia os dados era a trava, não a correção. Repetido com rascunho aberto (`isLocked: false`), que é a janela onde a perda acontecia. Com um autosave **parcial** (`{occupation}` apenas):

```
>>> RED FLAGS preservadas: SIM (12/12)
>>> TEXTOS preservados : SIM (5/5)   painPattern, alcoholUse, gpDetails, emergencyContact, emergencyContactPhone
>>> occupation final   : "SO ESTE CAMPO"   (a edição do app vale)
```

### C2–C5 ✅

- **C2:** submit sem consentimento → `400 Consent is required`; na UI, botão com `aria-disabled="true"` e aviso "Faltam 12 perguntas de segurança".
- **C3/C4:** respondidas Sim nas perguntas 1, 4 e 7 e Não no resto. Banco: exatamente o escolhido, `consentGiven: true`, `smoker: true` (boolean). `smoker: "yes"` (string antiga) agora é ignorado com 200 em vez de 500.
- **C5:** sem aceite → "Você ainda não aceitou os termos"; com aceite → selo. **Nenhuma data** em nenhum estado.

### C6 — regressão da web ✅ na camada de dados

Web desmarcando 3 red flags com o payload completo do formulário: `false` explícito **foi gravado**, os outros 9 intactos. UI web não executada — `/login` e `/dashboard` ficam presos em carregamento no ambiente local (o `.env` local não tem `DEFAULT_CLINIC_SLUG`).

### ❌ C11 e C12 — red flags gravadas sem serem perguntadas

**Motivo da reprovação.** Reproduzido na UI real:

**1. O primeiro autosave de uma paciente nova grava 12 "Não".** O autosave cai no **CREATE** da rota (`app/api/medical-screening/route.ts:241-298`), onde ainda está `body?.x ?? false` — `presentScreeningFields` só foi aplicado no UPDATE. E mesmo sem o `?? false`, as 12 colunas são `Boolean @default(false)`, não-nuláveis. **O banco não tem como representar "não perguntado".**

```
PC NAO respondeu nenhuma das 12 na tela.
false gravados: 12/12 | consentGiven: false | isSubmitted: false | filledBy: PATIENT
```

**2. A tela do terapeuta mostra isso como "negou".** `app/admin/patients/[id]/page.tsx:1291` renderiza cada `false` com check verde e não confere `isSubmitted`.

**3. Voltando ao rascunho, o envio é liberado sem responder.** `screening.tsx` pré-preenche o formulário com a linha do banco. Os 12 "Não" aparecem **selecionados** sem a paciente ter tocado em nenhum, `unanswered` fica 0 e o aviso desaparece. Só o checkbox de consentimento resta.

```
posts: [autosave rfFalse:12] [autosave rfFalse:12] [SUBMIT consentGiven:true rfFalse:12]
depois: falses: 12 | consentGiven: true | isSubmitted: true | isLocked: true | filledBy: PATIENT
```

Resultado: uma triagem **enviada e travada**, com 12 negações de sinais de alarme que a paciente nunca deu, registradas como resposta dela. Com `isLocked: true`, corrigir exige aprovação.

Screenshots: `t-12-red-flags-12-perguntas.png` (1ª visita, nada selecionado) · `t-12-bypass-red-flags-pre-selecionadas.png` (retorno, tudo "Não") · `t-12-bypass-envio-liberado.png`.

**A causa não é só do app.** O `initialData` do formulário web (`components/screening/medical-screening-form.tsx:110-121`) começa com as 12 em `false` e faz autosave do objeto inteiro. O rascunho da web tem o mesmo problema. **A causa raiz é o schema.**

---

## T-15

### C7 e C8 — fuso ✅

| data | hora | WEB | APP (novo) | APP (antigo) | igual |
|---|---|---|---|---|---|
| 2026-09-23 | 09:00 | 08:00Z | 08:00Z | 09:00Z | ✅ antigo desviava +1h |
| 2026-12-15 | 09:00 | 09:00Z | 09:00Z | 09:00Z | ✅ antigo coincidia |
| 2026-03-29 | 09:00 | 08:00Z | 08:00Z | 09:00Z | ✅ virada GMT→BST |
| 2026-10-25 | 09:00 | 09:00Z | 09:00Z | 09:00Z | ✅ virada BST→GMT |

Gravado pela rota real (via cookie de sessão web, porque o token do app dá 401 — ver C13): app e web gravam o mesmo instante, e a agenda mostra 09:00 nos dois casos. Confirmação independente: `/api/availability?date=2026-09-23` passou a omitir o horário das 09:00.

### ❌ C13 — o app não consegue gravar agendamento

```
curl -i -X POST http://localhost:4000/api/appointments -H "Authorization: Bearer $TOKEN" \
  -d '{"dateTime":"2026-09-23T08:00:00.000Z","treatmentType":"Follow-up"}'
HTTP/1.1 401 Unauthorized
{"error":"Unauthorised"}
```

O mesmo token dá 200 em `GET /api/appointments`, `/api/availability` e `/api/medical-screening`. Na UI real, "Confirmar Agendamento" voltou `401` e nenhuma linha foi criada.

**Causa:** `app/api/appointments/route.ts:117` usa `getServerSession(authOptions)`, que só aceita cookie. O `getActor(request)` da linha 139 já aceita o token do app. `session` não é usado em mais nenhum ponto do POST. A linha vem do primeiro commit (`1d16070d`, 24/02/2026) e é idêntica no `main`.

**Consequência: o app nunca agendou de verdade.** O desvio de 1h que a T-15 corrige só apareceria quando esse gate cair.

### ❌ C14 — "Your triage is done — Sent" é fixo

`booking-confirmed.tsx` mostra "Your triage is done / Your therapist will review it before you arrive / Sent" para qualquer paciente. PE **não tem triagem** no banco e vê o aviso. É o mesmo tipo de dado inventado que a T-15 removeu — a frase só trocou de "Bruno" para "Your therapist". E está em inglês numa tela em PT.

---

## Recomendações

1. **T-12 C11/C12 — alta, segurança clínica. Exige decisão, mexe no schema.**
   - **A (resolve):** migrar as 12 colunas para `Boolean?` (null = não perguntado); aplicar `presentScreeningFields` também no CREATE; admin mostra null como "não respondida", em cinza.
   - **B (sem migração, mais frágil):** guardar quais perguntas foram respondidas num campo à parte (`redFlagsAnswered`), consultado por app e admin.
2. **T-15 C13 — alta.** `app/api/appointments/route.ts:117-121` → usar o `getActor(request)` que já existe na linha 139.
3. **T-15 C14 — média.** Mostrar o card de triagem só com triagem real enviada, ou remover.

## Fora do escopo

- **Admin do paciente não compilava nesta branch** — importava `patient-email-panel.tsx`, que só existia no `main`. **Resolvido** pelo merge do `main` feito em seguida.
- **`/api/screening-config` não filtra por clínica** — `siteSettings.findFirst()` sem filtro. Hoje há uma linha global só, então o risco é latente, mas o texto de consentimento do app agora vem dali.
- **Termos do `consent.tsx` seguem fixos no JSX** — o estado de aceite ficou real, o texto não (passo 4 da T-12).
- **Levantamento em produção não executado** — só banco local. Pelo C13, é improvável haver agendamento feito pelo app em produção. Nas triagens, **a origem não é rastreável**: web e app gravam `filledBy: PATIENT`, sem campo que diga de onde veio.

## Dados de teste

**Criados:** 5 pacientes `p{a,b,c,e,f}.qa069@example.com`, clínica `qa069-norwich`, 4 triagens, 4 agendamentos, 4 `ClinicalEvidenceReport`, 46 refresh tokens.

**Removidos e conferidos:** `{"users":0,"screenings":0,"appts":0,"reports":0,"clinic":0}`. Dados `qa16-*` do outro agente intocados. Senha da fixture `qa.admina@example.test` reposta para `QaTenant#2026`.

⚠️ **E-mails reais provavelmente enviados.** Há chave Resend ativa no `.env` e a QA Clinic A não tem e-mail de notificação, então os alertas de admin caem no endereço fixo `brunotoaz@gmail.com`. As 4 triagens e os 4 agendamentos de teste devem ter gerado e-mails com assuntos como "Screening Submitted: Bruna App" e "New Appointment: Bruna App". **Tudo fictício, pode apagar.**
