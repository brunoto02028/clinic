# QA Report — Atividade 15 (T-7): ponta a ponta, os dois lados

**Data:** 2026-08-23 · **Resultado:** APROVADO · verificado ao vivo no dev server (`:4123`)

Fixtures locais: paciente de teste (maria.final.email@example.com / Test1234!) e staff
(admin@bpr.rehab / Staff1234!), mesma clínica. `AI_STRICT_MODE=true` no `.env` local.

## Lado do PACIENTE (gatilho)
- **4.1** Envio da triagem pela sessão real do paciente (`POST /api/medical-screening`,
  `credentials:'include'`) → **HTTP 200 em ~1.8s**, `success:true`. **Não travou** esperando IA.
  Screenshot: `qa/screenshots/live-15-patient-screening.png`.
- **4.2** Autosave (`_autosave:true`) não cria report (verificado por código).
- **4.4** Reenvio não duplica (guarda `existing` no gatilho + dedup no regenerate — pós-review).

## Job (GENERATING → DRAFT)
- **4.3 / 3.1** Poll ao vivo: `GENERATING(attempts 0) → attempts 1 (claim) → DRAFT evid=6`.
  Report real com 6 fontes da Europe PMC + narrativa Claude. Duas vezes reproduzido
  (report semeado e gatilho real).

## Lado da CLÍNICA (admin)
- **5.1** `admin/patients/[id]` → aba **Evidência**: relatório completo com **identidade real
  da BPR** (logo, paleta bruno, fontes), resumo do caso + escores, "No urgent red flags",
  narrativa, 6 fontes [F1]–[F6] por nível com links, recursos (disponível/fora-do-catálogo),
  tabelas de sugestões com fonte, lacunas, aviso clínico.
  Screenshot: `qa/screenshots/live-15-evidence-admin.png`. (A IA corretamente **excluiu**
  F2/F3 por irrelevância — bônus de qualidade.)
- **6.1** Toggle **EN/PT** troca rótulos; **6.2** "Traduzir para PT" preencheu `narrativePt`
  (termos clínicos + fontes preservadas). Screenshot: `live-15-pt-translated.png`.
- **5.4** **Aprovar** → status `APPROVED` (badge "Aprovado", `approvedAt`/`reviewedById`).
  Screenshot: `live-15-approved-pt.png`.
- **5.5** GET/PATCH exigem sessão staff (401 sem) — por código (`STAFF` guard).
- **5.6** Nada exposto ao paciente (sem rota de portal; clínico-interno).

## API / módulos
- **2.1** `lib/europe-pmc.ts` testado ao vivo (SR no topo, ordenado, journal populado).
- **3.2/3.3** Red-flag gate e provider Claude/pseudonimização — por código (urgent → só alerta;
  possible → gera com precauções).

## Typecheck
Limpo em todos os arquivos da atividade, antes e depois do code review.

## Code review — 8 achados, todos corrigidos
1. `{0 && …}` renderizava "0" na UI (2 pontos) → guardas `> 0`.
2. Job re-processava linha GENERATING (risco 2×) → claim condicional + janela de 5min.
3. Cap de tentativas inútil / linha presa → sweep de "desistência" (attempts≥3 → DRAFT+error).
4. Regenerate sem dedup → retorna o GENERATING existente.
5. `rest` cortado em 2 antes do fill → cap removido.
6. Gatilho só no create → enqueue-if-none também no update.
7. Link sempre "DOI" → "DOI" só com DOI, senão "Link".
8. Prompt `[F1]` vs `F1` → alinhado (sem colchetes).

## Notas para produção (não-bloqueantes)
- `AI_STRICT_MODE=true` precisa existir no ambiente de **produção** (só setei no `.env` local).
- Usei `prisma db push` no local; **migration formal** deve ser gerada no commit.
- Catálogo da clínica no banco **local** está vazio (dev) → tudo caiu como "fora do catálogo",
  o esperado; em produção o cruzamento fica real.
