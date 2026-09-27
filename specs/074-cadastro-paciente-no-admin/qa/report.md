# QA Report — 074: Cadastro do paciente no admin (T-1 backend + T-2 frontend)

## Code review — aprovado, sem bloqueios

Revisão sobre o diff completo (route.ts + page.tsx). Nenhum bug
bloqueante. Confirmado: lógica vazio→`null`/omitido→mantém correta
(comparação estrita `=== ""`, sem cair na pegadinha de falsy);
isolamento de tenant sem desvio (branch novo fica depois do guard
existente); e-mail realmente não editável (nem no `ALLOWED_FIELDS` nem
no formulário); diff pro AuditLog trata corretamente `Date` vs string
antes de comparar; `registrationForm` sempre populado antes de abrir
o modo edição (sem input não controlado); nenhuma superengenharia —
reaproveita `EF`, um card só, na posição pedida.

Dois nits de polish, não bloqueantes:
1. Nome não é trimado ao salvar (`"  John  "` grava com espaços) —
   só a validação de vazio usa `.trim()`, o valor gravado não.
2. A descrição do `AuditLog` não identifica qual membro da equipe fez
   a alteração (só o paciente afetado) — `therapistId` já está
   disponível no escopo mas não é usado na descrição, diferente do
   branch irmão `add_clinical_note`.

**Data:** 2026-09-24
**Ambiente:** QA local — dev server deste checkout (`C:\Users\bruno\Documents\clinic`) subido na porta 4000 (confirmado antes que nada mais ocupava a porta; processos em 4010/4100 pertencem a outro checkout, `orca\workspaces\clinic\app_clinic`, ignorados).
**Banco:** local (`bpr_clinic_local`), fixtures dedicados criados e removidos ao final — nenhum paciente real foi tocado.
**Resultado geral: ✅ aprovado** (20/21 cenários aprovados, 1 ressalva documentada — comportamento pré-existente do middleware, não regressão desta tarefa).

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---|---|---|
| 1 | GET paciente com todos os campos preenchidos | API | ✅ |
| 2 | GET paciente sem nenhum campo preenchido (todos `null`) | API | ✅ |
| 3 | PATCH só `address` → demais campos preservados | API | ✅ |
| 4 | PATCH `emergencyContactName: ""` → grava `null` (SELECT confirmado) | API | ✅ |
| 5 | PATCH `firstName`/`lastName` → refletido na listagem | API | ✅ |
| 6 | PATCH `dateOfBirth` válida → sem deslocamento de timezone | API | ✅ |
| 7 | PATCH `firstName: ""` → `400`, nome não apagado | API | ✅ |
| 8 | PATCH `dateOfBirth: "not-a-date"` → `400`, não estoura 500 | API | ✅ |
| 9 | PATCH sem campos válidos → `400` "No valid fields to update" | API | ✅ |
| 10 | Tenant isolation — staff da clínica B em paciente da clínica A | API | ✅ |
| 11 | Sem sessão válida | API | ⚠️ ver nota |
| 12 | AuditLog criado com nomes dos campos (não valores) | API | ✅ |
| 13 | Card "Registration" visível, paciente completo, formatado | UI | ✅ |
| 14 | Card com paciente sem nenhum campo — placeholders "—" | UI | ✅ |
| 15 | Modo edição — e-mail nunca aparece como input | UI | ✅ |
| 16 | Editar telefone + endereço, Save → sem reload (rede confirmada) | UI | ✅ |
| 17 | Editar `dateOfBirth` pelo seletor → idade recalculada | UI | ✅ |
| 18 | Salvar com nome vazio → erro visível, form preserva dados | UI | ✅ |
| 19 | Cancelar edição → reverte, sem chamar a API | UI | ✅ |
| 20 | Regressão — Invite Link/Actions/Adherence continuam OK | UI | ✅ |
| 21 | Isolamento de tenant na UI — clínica B não abre paciente da A | UI | ✅ |

## Nota de investigação (não é bug do T-1/T-2)

Ao abrir a página pela primeira vez no browser do Playwright, o card
"Registration" não apareceu, apesar do código estar correto no
servidor. Investigação (comparação do chunk servido via `curl` vs. via
browser, inspeção de `cache-control`/`date` do response) confirmou que
o browser estava servindo `page.js` de um cache HTTP obsoleto
(`cache-control: public, max-age=31536000, immutable`, datado de 4
dias antes do teste), sobrevivente de sessão Playwright anterior.
Forçar `fetch({cache:'reload'})` revalidou o cache e o card passou a
aparecer normalmente em todas as navegações seguintes — mesmo padrão já
catalogado na memória do usuário sobre cache/HMR obsoleto do Next dev.

## Detalhes

### API — Happy path

**1. GET paciente completo** ✅
```
curl -H "Cookie: next-auth.session-token=$TOKENA" http://localhost:4000/api/admin/patients/<patientFull>
→ 200
{"patient":{...,"address":"Rua Fixture, 100, Sao Paulo, SP","dateOfBirth":"1985-06-15T00:00:00.000Z","emergencyContactName":"Fixture Contact","emergencyContactPhone":"+55 11 90000-0002","emergencyContactRelation":"Spouse",...}}
```

**2. GET paciente vazio** ✅
```
→ 200
{"patient":{...,"phone":null,"address":null,"dateOfBirth":null,"emergencyContactName":null,"emergencyContactPhone":null,"emergencyContactRelation":null,...}}
```

**3. PATCH só `address`** ✅
```
curl -X PATCH -d '{"action":"edit_registration","address":"novo endereco 456, Rio de Janeiro"}' ...
→ 200
{"success":true,"patient":{...,"address":"novo endereco 456, Rio de Janeiro","phone":"+55 11 90000-0001","dateOfBirth":"1985-06-15T00:00:00.000Z","emergencyContactName":"Fixture Contact",...}}
```
Telefone, data de nascimento e contato de emergência preservados.

**4. PATCH `emergencyContactName: ""` → `null`** ✅
```
→ 200 {"...,"emergencyContactName":null,...}
```
Confirmado via SELECT direto no banco:
```json
{ "emergencyContactName": null, ... }
```
`NULL` real, não string vazia.

**5. `firstName`/`lastName` refletido na listagem** ✅
```
curl -X PATCH -d '{"action":"edit_registration","firstName":"FixtureUpdated","lastName":"PatientFullUpdated"}' ...
→ 200 {"...,"firstName":"FixtureUpdated","lastName":"PatientFullUpdated",...}
```
`GET /api/admin/patients` (listagem) confirmado com os novos nomes para o mesmo id.

**6. `dateOfBirth` válida, sem shift de timezone** ✅
```
curl -X PATCH -d '{"action":"edit_registration","dateOfBirth":"1990-01-31"}' ...
→ 200 {"...,"dateOfBirth":"1990-01-31T00:00:00.000Z",...}
```
SELECT direto confirma o dia `31` sem deslocamento.

### API — Entrada inválida

**7. `firstName: ""`** ✅ → `400 {"error":"First name cannot be empty"}`, banco inalterado.
**8. `dateOfBirth: "not-a-date"`** ✅ → `400 {"error":"Invalid date of birth"}`, sem 500.
**9. `{ "action": "edit_registration" }` (nenhum campo)** ✅ → `400 {"error":"No valid fields to update"}`.

### Auth / tenant isolation

**10. Tenant isolation (PATCH e GET)** ✅
```
→ 404 {"error":"Patient not found"}   (staff B tentando PATCH paciente da clínica A)
→ 404 {"error":"Patient not found"}   (staff B tentando GET o mesmo paciente)
```
SELECT confirma nenhuma alteração no paciente da clínica A.

**11. Sem sessão válida** ⚠️
```
curl -X PATCH (sem cookie) ...
→ 307, Location: /login?callbackUrl=%2Fapi%2Fadmin%2Fpatients%2F<id>
```
A qa-spec esperava `401`. O real é um redirect `307` para `/login`,
produzido pelo `middleware.ts` para toda rota `/api/admin/*` sem
token — comportamento idêntico em qualquer outra rota admin do
sistema, não introduzido pelo T-1. Não é regressão; é divergência
entre a spec de QA e o padrão de auth já estabelecido do projeto. Um
browser normal nunca vê isso, pois sempre navega autenticado.

### Auditoria

**12. AuditLog só com nomes de campos** ✅
Todos os logs gerados durante o teste (`action:
"PATIENT_REGISTRATION_UPDATED"`, `entity: "User"`, `entityId:
<patientId>`):
```
"Registration fields updated by staff: emergencyContactName"
"Registration fields updated by staff: address"
"Registration fields updated by staff: firstName, lastName"
"Registration fields updated by staff: dateOfBirth"
"Registration fields updated by staff: phone, address"
"Registration fields updated by staff: dateOfBirth"
```
Nenhum valor de campo aparece na descrição, só nomes.

### UI — Visualização

**13. Card completo, formatado** ✅ — `screenshots/t1-t2-13-registration-card-view.png`
Full name, telefone, endereço, `31/01/1990 (36 yrs)`, contato de
emergência (telefone · relação), antes do "Patient Invite Link".
E-mail não aparece no card.

**14. Card vazio, placeholders "—"** ✅ — `screenshots/t1-t2-14-registration-card-empty.png`
Layout não quebra, todos os campos "—", 0 erros de console.

### UI — Edição

**15. Modo edição sem input de e-mail** ✅ — `screenshots/t1-t2-15-registration-edit-mode-no-email.png`
7 campos editáveis (First/Last Name, Phone, Date of Birth, Address,
Emergency Contact Name/Phone/Relation). Nenhum campo de e-mail no
formulário.

**16. Editar telefone + endereço, salvar sem reload** ✅ — `screenshots/t1-t2-16-registration-saved-no-reload.png`
```
PATCH /api/admin/patients/<id>  body: {"action":"edit_registration","phone":"+55 11 98888-7777","address":"Av. Playwright QA, 200, Sao Paulo, SP",...}
→ 200 {"success":true,"patient":{"phone":"+55 11 98888-7777","address":"Av. Playwright QA, 200, Sao Paulo, SP",...}}
```
Card volta ao modo leitura sem reload da página.

**17. Editar `dateOfBirth`, idade recalculada** ✅ — `screenshots/t1-t2-17-dob-updated-age-recalculated.png`
`20/05/2000 (26 yrs)` exibido corretamente.

**18. Salvar com nome vazio → erro visível** ✅ — `screenshots/t1-t2-18-empty-name-error.png`
Banner "First name cannot be empty" exibido; formulário permanece em
edição com todos os outros campos intactos.

**19. Cancelar → reverte sem chamar API** ✅ — `screenshots/t1-t2-19-cancel-reverts.png`
Digitado "SHOULD NOT BE SAVED" em Address e cliquei Cancel; card
voltou ao valor salvo anteriormente; log de rede confirma nenhum PATCH
novo disparado.

### Regressão

**20. Resto da aba Summary continua funcionando** ✅
Invite Link, bloco "Actions" e painel "Adherence" renderizam e
funcionam normalmente com o card novo acima. "Red Flags Identified"
não apareceu para este fixture porque é condicional a `screening`
preenchido (fixture não tem) — esperado, não regressão.

**21. Isolamento de tenant na UI** ✅ — `screenshots/t1-t2-21-tenant-isolation-ui.png`
Staff da clínica B navegando direto para a URL do paciente da clínica
A recebe "Patient not found." limpo, com botão "Back to Patients".
Console só mostra os 404/400 esperados.

## Erros de console

Nenhum erro JS não esperado em nenhum fluxo. Os "erros" registrados
são apenas os logs automáticos do browser para respostas HTTP
não-2xx esperadas pelos próprios testes (400 de validação, 404 de
tenant isolation).

## Falhas e recomendações

Nenhuma falha real nos critérios de aceite de T-1 e T-2. Duas
observações de acompanhamento (não bloqueiam aprovação):

1. **Cenário 11**: `307` redirect em vez de `401` JSON — comportamento
   do middleware global, idêntico em toda `/api/admin/*`. A qa-spec
   deveria refletir o padrão real (ajuste de documentação, não de
   código); mudar esse padrão em si é uma decisão fora do escopo desta
   atividade.
2. **Nit de UX**: o banner de erro "First name cannot be empty"
   permanece visível até o staff fechá-lo manualmente ou até uma ação
   bem-sucedida limpar o estado — não bloqueia o uso, só um detalhe de
   polish (mesmo comportamento do banner de erro global já usado no
   resto da página, não é algo novo desta atividade).

## Fixtures e limpeza

Criados nesta sessão e removidos ao final (confirmado por query — 0
registros remanescentes): clínicas `qa-bp074-clinic-a`/
`qa-bp074-clinic-b`, staff `bp074.therapist.a/b@example.test`,
pacientes `bp074.patient.full/empty/b@example.test`, e os 9
`AuditLog` gerados pelos testes. Nenhum paciente real (ex. Mione De
Almeida, Ana Livia) foi acessado ou alterado. Os scripts de fixture/
cleanup temporários (`scripts/qa/bp074-*.cjs`) também foram removidos
ao final.
