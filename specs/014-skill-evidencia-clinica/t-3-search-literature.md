# T-3: scripts/search_literature.js — Europe PMC + classificação

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Script Node (18+, sem dependências, sem chave) que busca na Europe PMC e retorna JSON no
stdout, ordenado do nível de evidência mais forte para o mais fraco.

## Contexto
- Uso: `node scripts/search_literature.js "<query em inglês>" [maxResults]`.
- Europe PMC REST público. O doc avisa que **não foi testado do sandbox por rede** — o QA
  (T-6) roda a primeira execução real e valida os campos; o parsing pode precisar de ajuste.

## Passos
1. Chamar a REST da Europe PMC (`/webservices/rest/search`, formato JSON), com a query e
   `pageSize=maxResults` (default ~25).
2. Extrair por resultado: `id`, `source`, `title`, `authorString`, `journal`, `year`,
   `language`, `pubType`, `doi`/URL, `isOpenAccess`.
3. **Classificar por nível de evidência** de forma determinística a partir do `pubType`/
   título: systematic review/meta-analysis (mais forte) > RCT > guideline > revisão
   narrativa/outros (mais fraco). Anexar `evidenceLevel` e um `evidenceRank` numérico.
4. Ordenar por `evidenceRank` desc; imprimir JSON.
5. Tratar rede/erro com mensagem clara em stderr e exit ≠ 0 (não travar silenciosamente).

## Arquivos afetados
- `Skills/clinical-evidence-report/scripts/search_literature.js` (novo)

## Critérios de aceite
- [ ] Roda sem dependências (Node puro) e sem chave de API.
- [ ] Retorna JSON com os campos acima + `evidenceLevel`/`evidenceRank`.
- [ ] Ordenação por força de evidência (systematic review no topo).
- [ ] Mesmo input → mesma classificação (determinístico).
- [ ] Erro de rede → stderr + exit ≠ 0.
