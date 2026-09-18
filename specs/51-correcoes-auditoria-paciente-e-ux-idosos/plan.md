# Atividade 51 — Correções da auditoria da ficha do paciente + UX para idosos

## Objetivo

Resolver os 9 achados de duas rodadas de QA anteriores: a auditoria completa das 11 abas da
ficha do paciente (2 bugs reais + 2 melhorias menores) e a simulação de uma paciente de 73 anos
preenchendo o cadastro do zero pelo celular (5 melhorias de UX/acessibilidade).

## Decisões de design

- **T-1 e T-2 são bugs de verdade** (vazamento cross-tenant, falha silenciosa de IA) — tratados
  como correção direta, sem ambiguidade de design.
- **T-6 (Termos e Condições em PT)**: o conteúdo jurídico (`SiteSettings.consentTextsJson`) não
  tem campo `Pt` irmão, diferente de `Article.contentPt`/`ConditionPage.contentPt` já existentes
  no schema. Decisão: seguir o mesmo padrão — adicionar `consentTextsJsonPt`, com fallback pro
  inglês se vazio. **A tradução do texto jurídico que eu vou escrever precisa da sua revisão
  antes de considerar isso definitivo** — é conteúdo de compliance (GDPR/lei do Reino Unido), não
  é só tradução mecânica.
- **T-9 (contato de emergência)**: escolhido o fix mínimo — pré-preencher os campos da triagem
  (`MedicalScreening.emergencyContact`/`emergencyContactPhone`) com o que já está salvo no
  `User` (`emergencyContactName`/`emergencyContactPhone`) quando a triagem ainda não tem valor
  próprio. Não vou unificar os dois em um só lugar (isso tocaria a API de submissão da triagem e
  possivelmente relatórios/PDFs que leem `MedicalScreening.emergencyContact`) — fica pra uma
  atividade futura se quiser ir mais longe.
- **T-7 (pills)**: aumento direto do padding nos ~8 blocos de botão existentes (triagem +
  banner de cookies). Não vou extrair um componente `PillButton` compartilhado agora (o código
  já duplicado sugere isso seria bom, mas é refactor, não é necessário pro fix em si — fica
  registrado como ideia futura).
- **T-8 (slider de dor)**: troco o `<input type="range">` por botões 0-10, seguindo o padrão já
  existente em `daily-checkin-card.tsx`, mas com `h-11` (44px) em vez do `h-7` (28px) usado lá —
  o objetivo aqui é exatamente atingir o alvo de toque recomendado, não só copiar o padrão.

## Suposições (peço validação)

1. T-1: vou escopar por `clinicId` tanto a query de `ExercisePrescription` quanto a de
   `TreatmentProtocol` dentro de `getExpectedToday` (mesmo padrão de bug, mesmo lugar) — mesmo
   a auditoria só tendo citado `ExercisePrescription` explicitamente.
2. T-2: `maxTokens` sobe de 4000 para 6000. Se ainda truncar para pacientes com histórico muito
   extenso, o erro agora aparece claramente pro terapeuta (em vez de silenciar) — ele pode tentar
   de novo, então não estou tentando garantir que NUNCA trunque, só que nunca mais falhe em
   silêncio.
3. T-6: o texto em português que eu escrever é um rascunho de tradução, não uma revisão legal.
   Marco isso explicitamente no código/commit.
4. T-9: não adiciono `emergencyContactRelation` ao `MedicalScreening` (não existe campo pra isso
   na UI da triagem hoje, não faz parte do que foi pedido).

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Corrigir vazamento cross-tenant em getExpectedToday | concluído |
| T-2 | Corrigir truncamento silencioso do Rehab Agent (Atlas) | concluído |
| T-3 | Corrigir "?" literal no cabeçalho do Protocol | concluído |
| T-4 | Registrar ações clínicas no Activity log | concluído |
| T-5 | Traduzir banner de cookies pro português | concluído |
| T-6 | Termos e Condições bilíngue | concluído |
| T-7 | Aumentar área de toque dos botões pill/chip | concluído |
| T-8 | Trocar slider de dor por botões numéricos | concluído |
| T-9 | Pré-preencher contato de emergência na triagem | concluído |

## Achados de code review corrigidos (fora das 9 tarefas originais)

Duas rodadas de review sobre o diff completo encontraram, além de ajustes de qualidade (nomes
reais em vez de ID cru nos `logAudit`, N+1 evitado em `getExpectedToday`, centralização de
texto nos botões do cookie banner, regex mais robusto na extração do JSON do Atlas), **dois
achados sérios**, ambos corrigidos e re-testados antes do deploy:

1. **Falha de controle de acesso em `GET /api/medical-screening`** — o branch de staff aceitava
   `?patientId=` sem nenhuma checagem de que o staff tem acesso àquele paciente/clínica
   (pré-existente, mas esta atividade tornou o vazamento pior ao acrescentar o contato de
   emergência à resposta). Corrigido com `staffPatientAccess()`, o mesmo guard usado em outras
   rotas do projeto — retest confirmou 404 pra staff de outra clínica (sem vazar se o paciente
   existe), 200 normal dentro da própria clínica, sem regressão pro paciente vendo a própria
   triagem.
2. **Vazamento cross-tenant irmão em `GET /api/patient/protocol`** — mesma classe do T-1
   (`TreatmentProtocol` filtrado só por `patientId`, sem `clinicId`), na visão que o próprio
   paciente tem dos seus protocolos. Corrigido com o mesmo padrão.

Também corrigido: o banner de erro do T-2 usava um estado `error` compartilhado por ~9
handlers do `RehabAgentTab`, podendo mostrar o erro de uma ação não relacionada — extraído pra
um estado próprio (`tpError`).
