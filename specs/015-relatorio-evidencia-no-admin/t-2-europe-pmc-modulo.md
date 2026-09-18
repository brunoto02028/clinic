# T-2: Módulo de servidor Europe PMC

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Portar a busca + classificação de evidência da atividade 14 (`search_literature.js`) para um
módulo de servidor reutilizável dentro do app.

## Contexto
- O script da skill já foi validado ao vivo (Europe PMC real). Aqui vira TypeScript de servidor.
- Node 18+ tem `fetch`; sem dependência nova.

## Passos
1. Criar `lib/europe-pmc.ts` exportando `searchLiterature(query, maxResults)` que:
   - chama a REST da Europe PMC (`resultType=core`), com timeout (AbortController).
   - normaliza `pubType` (pode vir escalar), extrai id/doi/title/authors/journal
     (`journalInfo.journal.title`)/year/language/pubTypes/url.
   - classifica por nível (systematic review/meta-analysis > RCT > guideline > narrativa > outros),
     determinístico; ordena por evidência e ano.
   - retorna tipado; lança erro claro em falha de rede/HTTP (para o chamador tratar).
2. Helper `buildQueries(caseData)` que monta 2–4 queries **em inglês** a partir da condição/
   região (ex.: condição+exercício, condição+modalidade), sem PII.
3. Dedup por `id` ao juntar múltiplas queries.

## Arquivos afetados
- `lib/europe-pmc.ts` (novo)

## Critérios de aceite
- [ ] `searchLiterature` retorna resultados classificados/ordenados da API real.
- [ ] `pubType` escalar não quebra; timeout tratado.
- [ ] Só termos clínicos nas queries (sem PII).
- [ ] Sem dependência nova.
