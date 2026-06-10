# T-1: Pressão arterial (histórico + registrar)

**Status:** concluído (QA report-t-1.md aprovado)
**Depende de:** nenhuma

## Objetivo
Aba "Saúde" (índice com links p/ Pressão, Tarefas, Documentos, Educação) + tela de pressão
arterial: histórico de leituras e formulário para registrar nova.

## Passos
1. Adicionar aba `(tabs)/health.tsx` (índice com 4 links).
2. Tela `(app)/blood-pressure.tsx`: GET `/api/patient/blood-pressure` (histórico) + form POST (systolic/diastolic/pulse).
3. Camada `src/api/health.ts`.
4. Estados loading/erro/vazio; invalidar query após registrar.

## Critérios de aceite
- [ ] Aba Saúde lista as 4 sub-telas.
- [ ] Histórico exibe leituras reais.
- [ ] Registrar leitura persiste (confirmado por reload).
- [ ] Validação de campos (faixa válida).
