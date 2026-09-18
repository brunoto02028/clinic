# T-3: Documentos (lista + abrir)

**Status:** concluído (QA report-t-3.md aprovado)
**Depende de:** T-1

## Objetivo
Tela de documentos do paciente: lista e abertura (link/preview).

## Passos
1. Tela `(app)/documents.tsx`: GET `/api/patient/documents`.
2. Camada `src/api/documents.ts`.
3. Abrir documento via Linking (URL) ou preview; estados loading/erro/vazio.

## Critérios de aceite
- [ ] Lista exibe documentos reais.
- [ ] Abrir documento funciona (ou degrada com elegância).
- [ ] Estado vazio coerente.
