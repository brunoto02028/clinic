# T-4: Educação (lista + detalhe) + auth dual na rota

**Status:** concluído (QA report-t-4.md aprovado)
**Depende de:** T-1

## Objetivo
Tela de educação do paciente: lista de conteúdos e detalhe. Inclui tornar
`/api/education` acessível por bearer (auth dual + allowlist do middleware).

## Passos
1. Backend: trocar `getServerSession` por `getRequestSession` em `/api/education` (GET) e
   adicionar `/api/education` à allowlist mobile do `middleware.ts`.
2. Tela `(app)/education.tsx`: lista; `(app)/education/[id].tsx`: detalhe.
3. Camada `src/api/education.ts`.

## Critérios de aceite
- [ ] `/api/education` responde a bearer (200) e cookie (sem regressão).
- [ ] Lista e detalhe exibem conteúdos reais.
- [ ] Estado vazio coerente.
