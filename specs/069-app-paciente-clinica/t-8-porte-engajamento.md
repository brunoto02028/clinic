# T-8: Porte — engajamento

**Status:** pendente
**Depende de:** T-1

## Objetivo
Levar para o app as telas de engajamento **que forem do paciente de clínica**.

## Contexto
Agrupamento provisório e o mais sujeito a encolher.

Candidatas: `achievements`, `challenges`, `community`.

⚠️ As três existem também no produto do personal (ativ. 029 challenges, 030 badges) e a Comunidade foi **removida** do aluno de estúdio (ativ. 059). O módulo BA do app já tem suas próprias `achievements.tsx` e `community/`. Alto risco de portar tela de outro produto para dentro da clínica — a T-1 manda aqui.

## Passos
1. Confirmar na T-1 quais destas o paciente de clínica realmente acessa na web.
2. Portar só essas, sem reaproveitar as telas do módulo BA (públicos e dados diferentes).
3. Se nenhuma for do paciente de clínica, fechar a tarefa como "não aplicável" e registrar o porquê.

## Arquivos afetados
- `mobile/src/api/*.ts`
- `mobile/app/(app)/(clinica)/*.tsx`

## Critérios de aceite
- [ ] Nenhuma tela do produto do personal entrou no módulo clínica
- [ ] Nenhum dado de aluno de estúdio visível para paciente de clínica
- [ ] Se vazia, a tarefa registra a justificativa
