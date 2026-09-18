# QA — Atividade 51: correções da auditoria + UX idosos

## T-1 — Vazamento cross-tenant

- **API**: paciente com `ExercisePrescription`/`TreatmentProtocol` de outra clínica (dado de
  teste sujo) → `getExpectedToday` não inclui esses itens.
- **API**: paciente normal (mesma clínica em tudo) → resultado idêntico ao de antes da correção.
- **Regressão**: `GET /api/admin/patients/[id]/adherence-today`,
  `preview-patient-email`/`preview-yesterday-email`, `send-reminder`/`send-yesterday-followup`,
  `GET /api/patient/notifications`, relatório da clínica (`lib/clinic-daily-adherence.ts`) — todos
  continuam funcionando.

## T-2 — Rehab Agent truncamento

- **API**: resposta da IA truncada (forçar com `maxTokens` bem baixo num teste) →
  `POST /api/admin/patients/[id]/atlas-treatment-plan` com `action: "generate"` retorna `502` com
  `error` claro.
- **UI**: clicar "Generate Plan" na aba Rehab Agent, com truncamento forçado → mensagem de erro
  aparece pro terapeuta (via `setError`), não um card vazio.
- **API/UI**: geração normal (não truncada) → plano completo, sem regressão.

## T-3 — Placeholder do Protocol

- **UI**: protocolo sem `totalSessions`/`estimatedWeeks` → mostra "—", não "?".
- **UI**: protocolo com os dois valores → mostra os números normalmente.

## T-4 — Activity log

- **UI**: criar SOAP note pela ficha do paciente → evento aparece no Activity.
- **UI**: atribuir/enviar protocolo → evento aparece no Activity.
- **UI**: prescrever exercício → evento aparece no Activity.
- **API**: falha ao gravar o `logAudit` (simulável) não impede a criação do registro principal.

## T-5 — Banner de cookies em PT

- **UI**: site em português, banner de cookies (estado inicial + painel "Manage preferences"
  expandido) → tudo em português.
- **UI**: site em inglês → banner continua em inglês, sem regressão.
- **UI**: banner funciona numa página pública sem login (ex.: home).

## T-6 — Termos bilíngue

- **UI**: `/dashboard/consent` em português → documento inteiro (títulos + corpo de todas as
  seções) em português.
- **UI**: `/dashboard/consent` em inglês → sem mudança.
- **API**: `GET /api/admin/consent-texts?locale=pt-BR` sem `consentTextsJsonPt` configurado →
  cai no fallback `DEFAULT_CONSENT_TEXTS_PT`, não quebra.

## T-7 — Área de toque dos pills

- **UI**: cada grupo de botão listado na tarefa (triagem: Sim/Não, tipo de dor,
  Direita/Esquerda, Sedentário/Ativo, Álcool; banner de cookies: Accept/Reject/Save/Reject all)
  mede ≥44px de altura, em PT e EN.
- **UI**: viewport mobile 390px — sem corte/overflow visual.

## T-8 — Slider de dor → botões

- **UI**: 11 botões (0-10) aparecem na triagem, cada um ≥44px, clicáveis.
- **UI**: selecionar um número atualiza o estado e dispara autosave (mesmo comportamento do
  slider antigo).
- **UI**: viewport mobile 390px — botões legíveis, sem corte.

## T-9 — Prefill do contato de emergência

- **API**: paciente com contato de emergência salvo no `User`, sem `MedicalScreening` ainda →
  `GET /api/medical-screening` devolve os valores do `User` como default.
- **API**: paciente com `MedicalScreening.emergencyContact` já preenchido (diferente do `User`)
  → devolve o valor da própria triagem, não sobrescreve com o do `User`.
- **UI**: paciente sem nada preenchido em lugar nenhum → campos vazios, sem erro.
- **UI**: editar e enviar a triagem → grava em `MedicalScreening`, sem alterar `User`.
