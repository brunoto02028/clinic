# Atividade 15 — Relatório de evidência auto-gerado na área clínica

**Status geral:** pendente (aguardando aprovação do plano)

## Objetivo
Quando um paciente **envia a triagem**, gerar **automaticamente** um **relatório de evidência
clínica** (como o modelo aprovado no artifact da atividade 14) e disponibilizá-lo **na ficha do
paciente dentro do admin**, para o **fisioterapeuta revisar**. O relatório é **clínico-interno**:
nasce como rascunho e **não é enviado ao paciente** automaticamente. Bilíngue **EN/PT** e com a
**identidade visual real da BPR** do topo ao rodapé.

Promove a skill da atividade 14 (que roda sob demanda) para uma **feature dentro do app**,
reaproveitando a infraestrutura clínica que já existe.

## Como está hoje (base para não duplicar)
- Triagem: `app/api/medical-screening/route.ts` POST — salva, roda `analyzeMedicalScreening`
  (red flags), notifica. **Sem IA/relatório.** É o gancho.
- IA clínica **já existe** (acionada por clique): `app/api/admin/patients/[id]/diagnosis` e
  `.../protocol`, `lib/rehab-agent.ts` (Atlas), `callAIClinical` (Claude/GDPR, `AI_STRICT_MODE`),
  pseudonimização (`lib/pseudonymize`), agregação de dados da triagem já pronta.
- Estados: enum `DiagnosisStatus` (`GENERATING→DRAFT→UNDER_REVIEW→APPROVED→SENT_TO_PATIENT`).
- Automação: `lib/background-jobs.ts` (setInterval, sem fila) + `instrumentation.ts`.
- Busca de literatura: `Skills/clinical-evidence-report/scripts/search_literature.js` (Europe PMC)
  — validado ao vivo na atividade 14; será portado para módulo de servidor.
- Branding: `tailwind.config.ts` `bruno.slate #607d7d` / `bruno.turquoise #5dc9c0`; logo em
  `SiteSettings.logoUrl`/`public/logo.png`; fontes Inter/Sora.
- Admin do paciente: `app/admin/patients/[id]/page.tsx` (abas) — onde entra a aba nova.

## Decisões de design
1. **Segurança clínica primeiro.** Se a triagem tiver **red flag**, o relatório **não** gera
   sugestões de conduta — produz um **alerta** de avaliação humana prioritária. Reusa a análise
   que a rota de triagem já calcula.
2. **Clínico-interno.** O relatório vive na ficha do paciente **no admin**, para o fisio.
   **Nada vai ao paciente automaticamente** (o portal do paciente está fora do MVP).
3. **Auto-geração sem travar o paciente.** Na submissão da triagem cria-se o registro como
   `GENERATING` (fire-and-forget); um job do `background-jobs` processa e leva a `DRAFT`. A
   resposta da triagem ao paciente não espera a IA.
4. **GDPR/UK.** Geração via `callAIClinical` (Claude); pseudonimização do paciente
   (`lib/pseudonymize`); à Europe PMC vai só a *condição* (sem PII).
5. **Rastreabilidade.** Cada sugestão cita a fonte ([F1]…), como no modelo aprovado.
6. **Bilíngue EN/PT.** Rótulos/《chrome》sempre bilíngues (i18n, default en-GB). A **prosa gerada
   por IA** nasce em en-GB e é **traduzida sob demanda para PT** (reaproveita o chunking de
   tradução dos artigos) — evita dobrar custo de IA gerando dois idiomas de cara.
7. **Identidade BPR real.** `bruno.slate`/`bruno.turquoise`, logo oficial, Inter/Sora — do topo
   ao rodapé (nada do teal inventado no mockup).
8. **Modelo próprio** `ClinicalEvidenceReport`, distinto do `AIDiagnosis` manual (evita
   sobrecarregar aquele fluxo). Reusa o enum `DiagnosisStatus`.
9. **Reaproveitar e melhorar o que já existe** (steer do Bruno): a spec reusa a agregação de
   dados, pseudonimização, `callAIClinical`, o Atlas (`lib/rehab-agent.ts`) e os padrões de UI —
   e **corrige/melhora** esses trechos quando fizer sentido, em vez de criar tudo paralelo. Bugs
   encontrados na infra existente durante a implementação podem ser corrigidos (registrados no
   report de QA/《commit》da tarefa).

## Tarefas

| Tarefa | Nome | Status |
|--------|------|--------|
| T-1 | Modelo `ClinicalEvidenceReport` + migration | implementada — verificada (db push + client) |
| T-2 | Módulo de servidor Europe PMC (portar da atividade 14) | implementada — verificada (API real) |
| T-3 | Pipeline de geração (red-flag gate → busca → catálogo → IA) | implementada — verificada (gerou DRAFT real) |
| T-4 | Auto-gatilho na triagem + job `GENERATING → DRAFT` | implementada — verificada (job processou) |
| T-5 | Aba de revisão no admin (identidade BPR, evidência, sugestões, ações de status) | implementada — verificada (screenshots) |
| T-6 | Bilíngue EN/PT (rótulos i18n + tradução sob demanda da prosa) | implementada — verificada (toggle+traduzir ao vivo) |
| T-7 | QA (API + UI + red-flag + geração real) | concluída — os dois lados ao vivo |

**Tudo implementado e verificado ao vivo** (paciente envia triagem → job gera → clínica revisa
na aba Evidência, com EN/PT e Approve). Code review: 8 achados, todos corrigidos. Typecheck
limpo. **Nada commitado.** Produção precisa de `AI_STRICT_MODE=true` no ambiente + migration
formal do Prisma (usei `db push` local).

Ciclo por tarefa: implementar → **qa-tester** gera `qa/report-t-N.md` → code review → concluir.

## Suposições (validar antes de implementar)
- **Modelo novo** (`ClinicalEvidenceReport`) em vez de estender `AIDiagnosis`. Se preferir
  reusar o `AIDiagnosis`, muda T-1/T-3.
- **Auto-geração via `GENERATING` + job poll** (não inline). AI é lenta; não dá pra travar a
  submissão da triagem.
- **Bilíngue:** chrome sempre bilíngue; prosa de IA em en-GB + botão "traduzir PT" (sob demanda).
  Se quiser gerar EN **e** PT já na criação (custo ~2×), muda T-3/T-6.
- **Sem exposição ao paciente no MVP.** O modelo mantém a capacidade (`SENT_TO_PATIENT`) para o
  futuro, mas a UI do portal fica fora desta atividade.
- **Custo/tempo:** cada relatório faz 2–4 buscas Europe PMC + 1 chamada Claude (~8–16k tokens).
  Aceitável em background. (Se o volume de triagens for alto, revisitar.)
- **Provider:** Claude via `callAIClinical`; recomendo ligar `AI_STRICT_MODE` para não cair em
  Minimax/Groq com contexto clínico. Confirmar.

## Fora de escopo
- Exibir o relatório no **portal do paciente** (fica clínico-interno).
- **Export PDF/impressão** do relatório (fase futura; se quiser, viraria uma t-N).
- Envio automático ao paciente / qualquer conduta sem revisão humana.
- Substituir o fluxo manual de `AIDiagnosis`/`protocol` (continuam como estão).
