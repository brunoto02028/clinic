# T-5: Aba de revisão no admin (identidade BPR)

**Status:** pendente
**Depende de:** T-1

## Objetivo
Exibir o relatório na ficha do paciente no admin, com a identidade visual real da BPR, e ações
de revisão do fisio.

## Contexto
- `app/admin/patients/[id]/page.tsx` já é abas (screening, protocolo, rehab…). Entra como aba
  **"Evidência"**, seguindo o padrão das existentes.
- Layout aprovado no artifact da atividade 14 — **restilizado com a marca real**:
  `bruno.slate #607d7d` / `bruno.turquoise #5dc9c0`, logo (`SiteSettings.logoUrl`/`public/logo.png`),
  fontes Inter/Sora.

## Passos
1. API: `GET app/api/admin/patients/[id]/evidence-report/route.ts` (auth staff) devolve o
   relatório mais recente do paciente; `PATCH` muda `status` (DRAFT→UNDER_REVIEW→APPROVED) e
   grava `approvedAt`/`reviewedById`. (Sem `SENT_TO_PATIENT` no MVP.)
2. UI da aba: estados `GENERATING` (spinner "gerando…"), `DRAFT/APPROVED` (relatório completo),
   `error` (aviso + botão "tentar de novo"). Render:
   - cabeçalho com logo + identidade BPR; resumo do caso + escores (cores por entidade da spec 13).
   - **banner de red flag** quando aplicável (sem sugestões).
   - evidência por nível com [F1]… + DOIs; cruzamento disponível/fora-do-catálogo; tabela de
     sugestões com fonte; lacunas; **aviso clínico** no rodapé.
   - ações: "Marcar em revisão", "Aprovar" (status), e toggle **EN/PT** (T-6).
3. Botão "Regenerar" (cria novo `GENERATING`) para o fisio forçar nova geração.

## Arquivos afetados
- `app/admin/patients/[id]/page.tsx` (nova aba)
- `app/api/admin/patients/[id]/evidence-report/route.ts` (novo)
- componente(s) de render do relatório (ex.: `components/admin/evidence-report.tsx`)

## Critérios de aceite
- [ ] Aba "Evidência" mostra o relatório com a identidade real da BPR (logo/paleta/fontes).
- [ ] Estados GENERATING/DRAFT/APPROVED/error tratados.
- [ ] Ações de status funcionam (grava approvedAt/reviewedById).
- [ ] Red-flag renderiza banner e omite sugestões.
- [ ] Nada exposto ao paciente.
