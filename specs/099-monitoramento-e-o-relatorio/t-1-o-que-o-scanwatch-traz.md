# T-1: O que o ScanWatch traz e ninguém mostra

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Fechar a distância entre o que a ingestão **já guarda** e o que alguma tela
**mostra**.

## Contexto

`lib/withings-ingest.ts` salva ECG — o fato, a frequência e a classificação de
fibrilação atrial — desde a 074. Nenhuma tela lê isso: nem a do paciente
(`wearable-data.tsx` mostra sono, HRV, FC de repouso, SpO2 e passos) nem o
painel.

Um dado clínico guardado que ninguém vê é pior que um dado ausente: ele dá a
impressão de cobertura que não existe.

## Passos

1. Levantar, contra o banco, **todo** `dataType` que a ingestão grava e cruzar
   com o que cada tela lê. O resultado vira uma tabela no relatório de QA.
2. O ECG aparece: data, frequência, e o que o aparelho concluiu. **Sem
   interpretação nossa** e sem traçado.
3. Fibrilação atrial detectada é destaque no painel — não um número no meio de
   outros.
4. A tela de conexões diz **qual aparelho** está mandando o quê, e desde
   quando. Hoje ela diz só que há conexão.
5. Conferir o caminho da conta: uma conta Withings ligada a duas contas de
   paciente grava sono e passos **nos dois**. A tela de conexões precisa
   avisar quando isso está acontecendo.

## Arquivos afetados

- `mobile/app/(app)/(clinica)/wearable-data.tsx`
- `app/admin/biohacking/page.tsx`
- `lib/withings-ingest.ts` (leitura, sem mudança esperada)

## Critérios de aceite

- [ ] Nenhum `dataType` gravado fica sem tela
- [ ] O ECG aparece com data e conclusão do aparelho, sem traçado
- [ ] Fibrilação detectada tem destaque próprio
- [ ] A mesma conta em duas contas de paciente é avisada, não silenciosa
