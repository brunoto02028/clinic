# QA Report — T-2, T-3, T-4: Alerta de adesão para o staff + observação do paciente

**Data:** 23/09/2026
**Resultado geral:** ✅ aprovado

## Resumo

| # | Cenário | Tarefa | Tipo | Resultado |
|---|---------|--------|------|-----------|
| 1 | Card mostra paciente atrasado, dias sem atividade, link funcional pro perfil | T-2 | UI | ✅ |
| 2 | Clínica sem paciente atrasado → estado vazio, layout não quebra | T-2 | UI | ✅ |
| 3 | Sinal visível (ícone) quando paciente atrasado tem nota | T-2 | UI | ✅ |
| 4 | Nenhum botão "enviar"/"send" no card novo; nenhum POST de notificação disparado ao carregar o dashboard | T-2 | UI/Rede | ✅ |
| 5 | Paciente escreve observação, salva, recarrega → persiste | T-3 | UI | ✅ |
| 6 | Campo vazio salvo → não quebra, não cria "nota" perceptível | T-3 | UI | ✅ |
| 7 | Marcar exercício feito funciona normalmente, independente do campo de nota | T-3 | UI | ✅ |
| 8 | Paciente A não acessa/edita item do paciente B via API direta → 404 | T-3 | API | ✅ |
| 9 | Staff da mesma clínica vê a observação na seção "Patient notes", com o título do exercício certo | T-4 | UI | ✅ |
| 10 | Staff de outra clínica não consegue acessar a rota de notas desse paciente → 404 | T-4 | API | ✅ |
| 11 | `tsc --noEmit` e `eslint` limpos nos arquivos tocados | Transversal | Build | ✅ |
| 12 | Nenhuma chamada a `notifyPatient` nos arquivos tocados (leitura de código) | Transversal | Código | ✅ |

Todos os 12 cenários passaram. Não re-testei os cenários da T-1 (API `GET /api/admin/adherence/falling-behind`), conforme instruído — já aprovados em `qa/report-t-1.md`.

## Ambiente

- Servidor dev local (`npm run dev`, porta 4000) contra `bpr_clinic_local`.
- Havia um processo `node` antigo já escutando na porta 4000 (PID 32104, iniciado 08:51 — depois dos arquivos desta atividade, então provavelmente já compilava tudo certo, mas para eliminar qualquer dúvida derrubei mesmo assim e subi um processo novo do zero). Compilação limpa das rotas novas confirmada antes de testar.
- Sessões reais via `next-auth/jwt encode()` + cookie `next-auth.session-token`, igual à T-1 (`scripts/qa/mint-session-cookie.cjs`).
- UI testada com Playwright-as-a-library (não o MCP, para rodar de forma determinística e scriptável), seguindo o padrão já usado em `scripts/qa/bp069-online-playwright.cjs`. Scripts novos: `scripts/qa/qa071t234-playwright.cjs` e `scripts/qa/qa071t234-note-signal-shot.cjs`.
- Fixtures criadas com `scripts/qa/qa071t234-fixtures.cjs` (novo, mesma convenção da T-1) e removidas com `scripts/qa/qa071t234-cleanup.cjs`. Todo dado rotulado `qa071t234-*`.
- **Achado de fixture (não é bug do código sob teste):** os pacientes fixture precisaram de `fullAccessOverride: true` e `consentAcceptedAt` preenchido para passar pelos gates de `assertModuleAccess("mod_treatment")` e da tela "Terms & Consent Required" — sem isso, `/dashboard/treatment` fica bloqueado antes de chegar no componente sob teste.

## Detalhes

### T-2.1 — Card mostra paciente atrasado ✅

Fixture: Clínica A, paciente `patient-behind`, protocolo `SENT_TO_PATIENT`, item liberado, último log há 4 dias (mesmo padrão de fixture da T-1).

Card "Patients falling behind" mostra `QA071T234 patient-behind (delete me) — 4 days with no log`. Cliquei no nome e confirmei via `page.url()` que abre `/admin/patients/{patientId}` (a mesma URL do `href`).

Screenshot: `specs/071-alerta-adesao-staff/qa/screenshots/t-2-3-4-card-falling-behind-clinicA.png`

### T-2.2 — Clínica sem paciente atrasado → estado vazio ✅

Fixture: Clínica C, sem nenhum paciente. Mensagem exibida: "No patient has gone quiet — everyone with an active plan has logged something recently." Card continua visível (não some, não quebra layout).

Screenshot: `specs/071-alerta-adesao-staff/qa/screenshots/t-2-3-4-card-empty-state-clinicC.png`

### T-2.3 — Sinal de nota não vista ✅

Escrevi uma observação real (via `PATCH /api/patient/protocol`, sessão do próprio paciente) no item do paciente `patient-behind`. Confirmei por API que `hasNote` virou `true`:
```
curl -s "http://localhost:4000/api/admin/adherence/falling-behind" -H "Cookie: ..."
{"patients":[{"patientId":"...","name":"QA071T234 patient-behind (delete me)","daysWithoutActivity":4,"hasNote":true}]}
```
Screenshot: `specs/071-alerta-adesao-staff/qa/screenshots/t-2-3-4-card-note-signal.png` — ícone de balão de mensagem ao lado de "4 days with no log" (`[title="Has a patient note"]`, contagem confirmada = 1 via script).

### T-2.4 — Nenhum botão de envio no card; nenhum POST de notificação ao carregar ✅

Inspecionei visualmente o card novo — não há nenhum botão dentro dele, é texto puro (nome, dias, ícone opcional). Contrasta de propósito com o card "Today's adherence" ao lado, que tem "Send now" (pré-existente, de outra atividade, fora do escopo aqui).

Capturei toda a rede da navegação ao `/admin` (evento `request` do Playwright) e filtrei por `POST` a rotas contendo `notify|reminder|send-|email`: lista vazia (`[]`). Li também o código-fonte de `components/admin/adherence-falling-behind-card.tsx` e `app/api/admin/adherence/falling-behind/route.ts` — nenhuma chamada a `notifyPatient`, só um `GET` no `useEffect`.

### T-3.1 — Observação persiste após reload ✅

Como paciente `patient-note`, abri `/dashboard/treatment`, preenchi o campo "Add a note (optional)" do item HOME_EXERCISE com `"QA071T234 nota de teste — doeu um pouco mais hoje (fixture, apagar)"`, saí do campo (blur → salva), recarreguei a página. Textarea mostra o texto salvo depois do reload completo.

Screenshot: `specs/071-alerta-adesao-staff/qa/screenshots/t-2-3-4-note-persisted-after-reload.png`

### T-3.2 — Campo vazio não quebra ✅

Apaguei o texto, saí do campo. Nenhum erro (`Application error` ausente do body), recarreguei e confirmei que o campo voltou vazio (`patientNotes` gravado como string vazia via `PATCH`, coerente com `if (notes !== undefined) updateData.patientNotes = notes`).

### T-3.3 — Marcar exercício feito funciona independente da nota ✅

Na mesma tela, o item mostra a faixa de dias da semana ("Mark the days you did it") com o dia já marcado pelo log da fixture (ícone de check verde), contagem "1/7 this week" — funcionando normalmente ao lado do campo de nota, sem interferência entre os dois.

Screenshot: `specs/071-alerta-adesao-staff/qa/screenshots/t-2-3-4-treatment-final-state.png`

### T-3.4 — Paciente A não acessa item do paciente B via API direta ✅

```
curl -X PATCH http://localhost:4000/api/patient/protocol \
  -H "Cookie: next-auth.session-token=<jwt patient-note>" \
  -d '{"itemId":"<itemId do patient-b, clínica B>","notes":"tentativa de invasao qa071t234"}'

HTTP/1.1 404 Not Found
{"error":"Not found"}
```
Confirmei por SELECT direto que `patientNotes` do item do `patient-b` continuou `null` — nada foi escrito. Bate com a checagem de ownership em `app/api/patient/protocol/route.ts:230` (`item.protocol.patientId !== effectiveUser.userId`).

### T-4.1 — Staff da mesma clínica vê a observação ✅

Como `adminA` (mesma clínica do `patient-note`), abri `/admin/patients/{patientNoteId}`. Seção "PATIENT NOTES" (texto em caixa alta por CSS `uppercase`) aparece com o título certo do item (`QA071T234 item 0 (delete me)`) e o texto da observação, exatamente como escrito pelo paciente.

Screenshot: `specs/071-alerta-adesao-staff/qa/screenshots/t-2-3-4-staff-sees-patient-note.png`

*Nota sobre o próprio script de QA:* minha primeira tentativa automatizada procurava a string exata `"Patient notes"` no texto da página e falhou (`hasPatientNotesHeading=false`) — falso negativo do meu script, não bug do produto: o CSS aplica `text-transform: uppercase` no heading, então `innerText` retorna `"PATIENT NOTES"`. Confirmado visualmente pelo screenshot, que é a evidência real usada para aprovar este cenário.

### T-4.2 — Staff de outra clínica não acessa a rota de notas ✅

```
curl http://localhost:4000/api/admin/patients/{patientNoteId}/protocol-notes \
  -H "Cookie: next-auth.session-token=<jwt adminB, clínica B>"

HTTP/1.1 404 Not Found
{"error":"Patient not found"}
```
Isolamento de tenant confirmado — `staffPatientAccess` (`lib/staff-patient-access.ts`) barra antes mesmo de a query rodar.

### Transversal — `tsc`/`eslint` ✅

```
npx tsc --noEmit -p tsconfig.json   # sem erros nos arquivos tocados
npx eslint components/admin/adherence-falling-behind-card.tsx \
  "app/api/admin/patients/[id]/protocol-notes/route.ts" \
  components/admin/patient-adherence-panel.tsx \
  app/dashboard/treatment/page.tsx \
  app/admin/page.tsx

app/admin/page.tsx
  5:52  warning  'CardDescription' is defined but never used
app/dashboard/treatment/page.tsx
  126:6  warning  React Hook useEffect has a missing dependency: 'fetchProtocols'

✖ 2 problems (0 errors, 2 warnings)
```
Zero erros. Os dois warnings são pré-existentes (não em código adicionado por esta atividade). Não bloqueiam a aprovação, mas ficam mais visíveis agora que esses arquivos foram editados.

## Erros de console

Nenhum erro de console JS em nenhum dos fluxos testados, exceto um erro transitório de prefetch do Next.js (`Failed to fetch RSC payload... Falling back to browser navigation`) na primeira execução do teste de clique no link do card — não se repetiu na reexecução e não impediu a navegação (fallback funcionou). Registro como possível flake de prefetch do dev server, não reproduzido de forma consistente.

## Falhas e recomendações

Nenhuma falha no código sob teste. Pontos de atenção (não bloqueantes):

1. **Fixtures de paciente para telas web precisam de `fullAccessOverride` + `consentAcceptedAt`** — sem isso, `/dashboard/treatment` fica preso atrás do gate de módulo (`mod_treatment`) e da tela de Termos & Consentimento. Vale padronizar nos próximos scripts de fixture de paciente.
2. **Dois warnings de eslint pré-existentes** nos arquivos tocados — nenhum introduzido por T-2/T-3/T-4, mas ficam mais visíveis agora. Sinalizo para o code review avaliar se vale limpar de brinde.
3. **Flake de prefetch do Next.js dev-mode** ao clicar no link do card na primeira execução do script (não reproduzido na segunda rodada) — não afetou o resultado final.

## Limpeza

Todas as fixtures (`qa071t234-*`: 3 clínicas — A, B, C —, 6 usuários, 3 protocolos, 2 logs de conclusão) foram removidas via `scripts/qa/qa071t234-cleanup.cjs`. Confirmado por SELECT direto que não resta nenhuma linha com slug/email iniciando em `qa071t234-` em `Clinic` ou `User`, nem protocolo com título `QA071T234*`:
```
POST-CLEANUP CHECK: { "remainingClinics": 0, "remainingUsers": 0, "remainingProtocols": 0 }
Cleanup confirmed clean.
```

---

**Resultado geral: ✅ aprovado — 12/12 cenários passaram.**
