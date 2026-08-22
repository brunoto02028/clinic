# T-6: Bilíngue EN/PT

**Status:** pendente
**Depende de:** T-3, T-5

## Objetivo
Rótulos/《chrome》do relatório em EN e PT, e tradução sob demanda da prosa gerada por IA.

## Contexto
- App é bilíngue (i18n, default en-GB). A prosa nasce em en-GB; PT é gerada sob demanda.
- Reaproveita o chunking de tradução dos artigos
  (`app/api/admin/articles/translate/route.ts`) para não truncar textos longos.

## Passos
1. Rótulos da UI (seções, colunas, ações, aviso clínico) via i18n EN/PT, seguindo o padrão do
   admin. Toggle EN/PT no cabeçalho do relatório.
2. `POST .../evidence-report/translate` (ou parte do PATCH): se `narrativePt` vazio e o fisio
   pedir PT, traduz `narrativeEn` (+ textos de sugestões) para PT com o chunking existente e
   grava `narrativePt`. Idempotente (não retraduz se já existe).
3. Fontes/títulos de estudos **não** são traduzidos (dado bibliográfico).

## Arquivos afetados
- `components/admin/evidence-report.tsx` (toggle + rótulos)
- `app/api/admin/patients/[id]/evidence-report/route.ts` (ação de tradução)
- possível helper i18n

## Critérios de aceite
- [ ] Rótulos corretos em EN e PT; toggle funciona.
- [ ] "Traduzir PT" preenche `narrativePt` sem truncar; idempotente.
- [ ] Títulos/autores de estudos permanecem no idioma original.
