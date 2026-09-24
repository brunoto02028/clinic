# QA — correções do code review (8 achados), atividade 070

**Data:** 22/09/2026 · **Branch:** `brunoto02028/app_clinic` em `8cd4ee20` · `main` em `5a9c02e3`
**Ambiente:** Next dev :4000 · Expo Web :8081 `--offline` · Postgres `bpr_clinic_local`
**Regra:** nenhum código-fonte editado; falhas simuladas com `page.route(...)`.
**Veredito:** ✅ **Aprovado.** 14 cenários, 0 reprovados.

## Escopo confirmado por git

Fora de `mobile/` e `specs/`, diferem do `main` só as 3 rotas do app mais o `.gitignore` (que só acrescenta `.qa-tmp/`, sem código). O ramo do personal em `/api/mobile/modules` é idêntico ao `main`.

## Resumo

| # | Cenário | Resultado |
|---|---|---|
| R1a | Paciente nova: 1º autosave grava 12 `false`; rascunho reaberto mostra as 12 **sem seleção**, "Faltam 12", envio bloqueado | ✅ |
| R1b | 12 respondidas tocando + consentimento → envio liberado, banco com os valores escolhidos | ✅ |
| **R1c** | **`nightPain: true` salvo pela web aparece sem seleção; 3 autosaves sem tocar mantêm `true`; só muda com o toque** | ✅ |
| #2 | `screening-config` → 500 com `consentGiven: true`: envio desabilitado, 0 POST | ✅ |
| #3 | `mod_clinica` = `false` / `"locked"` / `"hidden"` → `[]`; app mostra "No areas available yet" + Sign out | ✅ |
| #3-reg | Sem override → `[clinica]` · terapeuta → `lab,clinica,ba` · aluno → `treino,avaliacoes,nutricao` | ✅ |
| #4 | clinical-notes exige `mod_records`: negado 403, com acesso 200 — igual a `/api/soap-notes` | ✅ |
| #5 | Nota com `clinicId` NULL aparece; nota de outra clínica fica fora | ✅ |
| #6 | consent: spinner ao carregar; na falha, "Não foi possível verificar o seu aceite", não "não aceitou" | ✅ |
| #7 | assessment-progress: na falha, erro + "Tentar de novo", não o estado vazio | ✅ |
| #8 | `CONSENT_FORM` → "Termo de Consentimento"; `MEDICAL_REPORT` → ícone de laudo | ✅ |
| Reg-1 | Web: POST `/api/appointments` com cookie → 200 + linha | ✅ |
| Reg-2 | App: agendar pela tela → 200 + linha (10:00 BST → `09:00Z`) | ✅ |
| Reg-3 | Cache entre contas: B abre o wizard vazio depois de A, no mesmo processo JS | ✅ |

## Destaques

**R1c — o teste crítico.** Rascunho gravado pela rota da web com cookie (`nightPain: true`). No app, a pergunta aparece sem seleção. Três autosaves **sem tocar** reenviaram `nightPain: true` em cada body, e o banco manteve `true` — o `updatedAt` mudou, então o UPDATE rodou de fato. Só depois de tocar "Não" o valor virou `false`. Nenhum dado da web se perde.

**#4 — desenho do teste.** Os overrides foram cruzados para separar a regra nova da antiga: `mod_records:false` + `mod_clinical_notes:true` (a regra antiga daria 200) e o inverso (a antiga daria 403). App e web responderam **idênticos** nos dois.

**R1b — sem IA.** O relatório de evidência criado pelo envio parou nas red flags ("Severe Night Pain", `aiModel: null`). Nenhuma chamada de IA.

## Observações — nenhuma é falha desta rodada

1. **`.gitignore` também difere do `main`** (só `.qa-tmp/`). Registrado na tabela de escopo do `plan.md`.
2. **Pré-existente: `npx tsc --noEmit` no `mobile/` esconde erros.** O TS5101 (`baseUrl` deprecado) interrompe a checagem; com `--ignoreDeprecations 6.0` aparecem 21 erros, vindos do commit `894d174d8` (11/08). Não afetam o runtime.
3. ⚠️ **Pré-existente, igual no `main` — texto para o paciente conflita com a política de IA.** O termo de consentimento exibido diz *"Uso de IA: Google Gemini e Minimax…"*, e o `.env` anota *"NEVER send patient data to Minimax"* (`AI_STRICT_MODE`). O texto vem do `DEFAULT_CONFIG` de `/api/screening-config` — **é compartilhado com a web**, então não foi alterado aqui. Revisar em PT e EN.
4. **Comportamento antigo do autosave:** um toque só é salvo quando o paciente muda de etapa. O valor carregado nunca se perde (R1c).
5. **Custo aceito do #1:** um "Sim" real salvo na web aparece sem seleção e precisa ser confirmado; o envio fica bloqueado até lá.

## Dados e efeitos colaterais

- **E-mails: 0 enviados.** Os 7 envios para `qa070h-*@example.com` falharam antes de sair (sem chave do Resend na cópia do `.env`, `OUTBOUND_MODE=sink`). Nenhuma menção ao e-mail do Bruno.
- **IA: 0 chamadas.**
- **Criados** (prefixo `qa070h`): 3 clínicas, 15 usuários, 4 SOAPNote, 3 PatientDocument, 7 TherapistAvailability, e pelos testes 4 MedicalScreening, 2 Appointment, 1 ClinicalEvidenceReport, 43 refresh tokens, 34 SystemLog, 34 AuditLog. **Todos removidos** — varredura final por `%qa070h%` e pelos ids: `{}`.
- **Código:** nenhum arquivo-fonte editado; `.env`, `.qa-tmp/` e `.playwright-mcp/` removidos; portas livres.
- O Playwright MCP travou numa aba presa no loop do F1 (sign-out); os testes rodaram com Playwright 1.60 via Node, um contexto novo por cenário.
