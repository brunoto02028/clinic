# QA Report — T-3: Avaliação corporal atrás do acesso por tenant

**Data:** 2026-09-10
**Executado por:** agente qa-tester. O relatório foi gravado pela sessão principal porque a escrita do agente foi bloqueada.
**Ambiente:** somente local. `next dev` em `http://localhost:4190` com `DEFAULT_CLINIC_SLUG=bruno-physical-rehabilitation`, banco `bpr_clinic_local`, guarda de e-mail (T-1) ativa. Nenhum acesso a prod, nenhuma alteração de código.
**Fixtures:** `scripts/qa/tenant-fixtures.cjs` (tenant A `qa-clinic-a`, tenant B `qa-studio-pt`); limpeza no fim.
**Alvo da matriz:** avaliação **A1** (`BA-QA-A1`, tenant A, dono `qa.pacientea`).
**Resultado geral:** ✅ **aprovado** — 11 cenários, 11 passaram, 0 reprovados.

**Como foi executado:** login pela tela real (`/login` para pacientes, `/staff-login` para staff) no Playwright, com signOut entre as contas (sessão conferida vazia a cada troca), e as chamadas feitas por `fetch()` dentro da página logada — passando por middleware, cookies e sessão como um cliente real.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| M1 | Staff de outro tenant (`qa.trainer`, ADMIN de B) nas 13 rotas → 404 idêntico; A1 intacta | API | ✅ |
| M2 | Paciente de outro tenant (`qa.aluno`) → 403 em `/api/admin/...`, 404 no PDF | API | ✅ |
| M3 | Paciente do mesmo tenant, não dono (`qa.pacientea2`) → 403 / 404 no PDF | API | ✅ |
| M4 | Dono (`qa.pacientea`) → 403 nas rotas de admin, **200 PDF** no report-pdf | API | ✅ |
| M5 | Staff do mesmo tenant: GET/PUT por `qa.fisioa`; PDF e DELETE de A2 por `qa.admina` | API + DB | ✅ |
| M6 | 404 indistinguível: A1 alheia × ID inexistente | API | ✅ |
| L1 | Lista por papel + cookie de impersonação forjado | API | ✅ |
| L2 | SUPERADMIN (D4): sem cookie → tenant padrão; com cookie → tenant A | API | ✅ |
| C1 | Criação: staff de B com paciente de A → 404; `qa.admina` → 201 no tenant A | API + DB | ✅ |
| REG | Telas: `/admin/body-assessments` e área do paciente | UI | ✅ |
| Sink | `Sent via Resend` no log | Log | ✅ 0 |

## Detalhes

### M1 — `qa.trainer` (ADMIN do tenant B) contra A1 ✅
As 13 rotas do escopo mais o PDF responderam **404 `{"error":"Assessment not found"}`**, `content-type: application/json`: GET, PUT (`{"therapistNotes":"QA T-3"}`), DELETE, `ai-enhance`, `analyze`, `request-recapture`, `send-capture-link`, `export-exercises`, `generate-home-protocol`, `generate-notes`, `upload-photo`, `send-to-patient` (POST e DELETE) e `report-pdf`.

Estado do banco depois: A1 continua no tenant A, com `therapistNotes: null`, `status: PENDING_CAPTURE` e `updatedAt` igual ao da criação das fixtures — nenhuma escrita passou.

### M2 — `qa.aluno` (PATIENT do tenant B) ✅
**403 `{"error":"Forbidden"}`** nas 13 rotas de admin (o `requireStaff` corta antes de consultar o registro, então o 403 também não revela se a avaliação existe) e **404** no `report-pdf` de A1. A lista trouxe só `BA-QA-B1`, a avaliação dele.

### M3 — `qa.pacientea2` (PATIENT do tenant A, não é o dono) ✅
Mesmo resultado de M2: 403 nas rotas de admin e 404 no PDF de A1. A lista trouxe só `BA-QA-A2`.

### M4 — `qa.pacientea` (dono de A1) ✅
- 403 nas 13 rotas de admin — o paciente não usa as rotas de staff, mesmo sendo o dono.
- `GET /api/body-assessments/{A1}/report-pdf` → **200**, `application/pdf`, 10.668 bytes, `filename="body-assessment-BA-QA-A1.pdf"`.
- Lista: só `BA-QA-A1`.

### M5 — Staff do mesmo tenant (positivos) ✅
`qa.fisioa` (THERAPIST do tenant A):

| Chamada | Status | Resultado |
|---|---|---|
| `GET {A1}` | 200 | `BA-QA-A1`, `status=PENDING_CAPTURE` |
| `PUT {A1}` `{"therapistNotes":"QA T-3"}` | 200 | nota gravada |
| controle: `GET {B1}` (tenant B) | 404 | `{"error":"Assessment not found"}` |
| lista | 200 | só tenant A |

No banco, só A1 mudou; A2 e B1 seguiram inalteradas.

`qa.admina` (ADMIN do tenant A): PDF de A1 → 200 (11.135 bytes); `DELETE {A2}` → 200 e, na sequência, `GET {A2}` → 404. O total de linhas do banco confirma que nada mais foi apagado.

Conforme combinado, **não** foram executados positivos de `analyze`, `ai-enhance`, `generate-notes`, `generate-home-protocol` nem `export-exercises` (IA paga / escrita pesada). Essas rotas foram exercidas nos negativos, onde a guarda responde antes de qualquer chamada de IA.

### M6 — 404 indistinguível ✅
Como `qa.trainer`, na mesma sessão: A1 (existe, tenant alheio) e `does-not-exist` devolveram **status, cabeçalho e corpo idênticos**. Pela resposta não dá para saber se a avaliação existe.

### L1 — Escopo da lista ✅
| Ator | `GET /api/admin/body-assessments` |
|---|---|
| `qa.trainer` (ADMIN B) | só `BA-QA-B1` |
| staff do tenant A | `BA-QA-A2`, `BA-QA-A1` |
| `qa.pacientea` (PATIENT) | só `BA-QA-A1` |
| `qa.pacientea` **com cookie forjado** `impersonate-patient-id=<id do pacienteA2>` | **ainda só `BA-QA-A1`** |

O cookie foi mesmo gravado no navegador e não mudou o escopo: a impersonação só vale para staff. Com o cookie ativo, o PDF de A2 também deu 404. O cookie foi removido ao fim do cenário.

### L2 — SUPERADMIN (D4) ✅
| Situação | Chamada | Resultado |
|---|---|---|
| sem `selected-clinic-id` | lista | 200 · 0 registros; nenhum `BA-QA-*` |
| sem cookie | `GET {A1}` | **404** |
| com `selected-clinic-id=<clínica A>` | lista | 200 · `BA-2026-00001`, `BA-QA-A1` |
| com cookie | `GET {A1}` | **200**, `clinicId` = tenant A |

Sem cookie a resposta foi 200 com lista vazia, ou seja: o tenant padrão foi resolvido e a lista ficou restrita a ele. Contagens de referência no momento do teste: tenant padrão 0 avaliações, outra clínica local 1, `qa-clinic-a` 2, `qa-studio-pt` 1. **Antes da T-3 o SUPERADMIN veria todas.**

### C1 — Criação ✅
| Ator | Corpo | Status | Resultado |
|---|---|---|---|
| `qa.trainer` (B) | `{"patientId":"<pacienteA>"}` | **404** `{"error":"Not found"}` | nada criado |
| `qa.admina` (A) | `{"patientId":"<pacienteA>"}` | **201** | `clinicId` = tenant A, `therapistId` = adminA |

A avaliação nova nasceu no tenant do paciente, sem `clinicId` vazio e sem "qualquer clínica".

### REG — Telas ✅
- Staff do tenant A em `/admin/body-assessments`: "Total 2 / Pending Capture 2", exatamente `BA-QA-A2` e `BA-QA-A1`. Nada do tenant B nem da clínica real. (`screenshots/t-3-admina-lista-tenant-a.png`)
- Paciente `qa.pacientea`: `/dashboard` abre sem erro (`screenshots/t-3-paciente-dashboard.png`) e a listagem de avaliações devolve só a própria (`screenshots/t-3-paciente-lista-somente-a1.png`).

### Sink ✅
`Sent via Resend`: **0**. Também 0 linhas `[OUTBOUND-SINK]`, porque `send-capture-link`, `send-to-patient` e `request-recapture` foram barradas antes de qualquer envio. Nenhuma exceção não tratada no log.

### Limpeza ✅
`leftover fixtures: 0`, exit 0. Depois da limpeza o banco voltou ao estado anterior à rodada.

## Erros de console
Nenhum erro de JavaScript. Os erros no console são os 403/404 das próprias chamadas de teste, mais um `404 /favicon.ico` preexistente. Nenhuma tela quebrou.

## Falhas e recomendações
Nenhuma falha. Observações para a T-7:

- **O1 — o 404 da criação usa outra mensagem.** `POST /api/admin/body-assessments` com paciente de outro tenant responde `{"error":"Not found"}` (vem do `assertPatientAccess`), enquanto as rotas `[id]` respondem `{"error":"Assessment not found"}`. São rotas diferentes, então não há vazamento por comparação; só afeta as asserções da suíte.
- **O2 — o cenário do SUPERADMIN ficaria mais forte com dado no tenant padrão.** Localmente o tenant padrão tem 0 avaliações, então a lista vazia é prova fraca; a prova forte é o par `GET {A1}` 404 → 200 com o cookie. Semear uma avaliação no tenant padrão na T-7.
- **O3 — a área web do paciente não tem tela de avaliação corporal.** Quem consome isso é o app, por `/api/patient/body-assessments`, que só devolve avaliações já enviadas. Não é regressão desta tarefa.
- **O4 — paciente recebe 403, não 404, nas rotas de staff.** É o comportamento certo e não vaza nada, porque o `requireStaff` responde antes de consultar o registro. A suíte não deve esperar 404 aí.

**Veredito: APROVADO.**

## Code review e correções
7 achados, todos corrigidos: SUPERADMIN sem clínica selecionada passa a usar a clínica do próprio usuário (alto); paciente sem clínica devolve 409 em vez de 404 (médios); e-mail bloqueado deixa de ser arquivado como enviado (médio); mais comentário, isolamento da variável de ambiente no teste e variável morta (baixos).

**Reteste:** 129/129 testes. Em runtime, dois `POST /api/auth/forgot-password` seguidos → 2 linhas `[OUTBOUND-SINK]`, 2 linhas "not filed as sent", **0** `EmailMessage` arquivados, 0 P2002 e 0 `Sent via Resend`.
