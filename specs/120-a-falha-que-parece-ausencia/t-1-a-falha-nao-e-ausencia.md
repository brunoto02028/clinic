# T-1: A falha do banco não pode parecer ausência de dado

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Que uma consulta que falhou produza um estado **diferente** de uma consulta que
não encontrou nada, em todo o caminho do acompanhamento.

## Contexto

`lib/patient-monitoring.ts` tem seis `.catch(() => [])` (linhas 267, 272, 276,
281, 286 e 392). Cinco são anteriores; o sexto entrou em 02/10 na leitura do
`EcgRecording` — ou seja, a correcção que fez o ECG voltar ao papel **adoptou o
padrão** em vez de o questionar.

O efeito: um `connection refused` de meio segundo produz um relatório clínico
sem secção de ECG, sem pressão, sem adesão — **idêntico** ao de um paciente que
nunca mediu nada. O papel vai à mão de um médico e não tem como dizer a
diferença.

`app/api/patient/reports/route.ts:50` faz o mesmo: `.catch(() => [])` na lista, e
a tela do paciente diz *"ainda não há relatórios"*.

## Passos

1. `lib/patient-monitoring.ts`: um auxiliar `lerOuFalhar(nome, promessa)` que
   devolve `{ dados, falhou }`, para as seis chamadas ficarem iguais.
2. `getMonitoringData` acumula o que falhou em `naoLidos: string[]`.
3. `lib/patient-report.ts`: com `naoLidos` não vazio, o papel escreve a ressalva
   nas duas línguas — *"Parte dos dados não pôde ser lida nesta geração: X. O
   que falta aqui pode existir."*
4. A secção cuja leitura falhou **não** se desenha vazia.
5. `app/api/patient/reports/route.ts`: o `.catch` devolve 503 com
   `{ code: "reports_unavailable" }` em vez de lista vazia.
6. A tela do app distingue os dois estados.

## Arquivos afetados

- `lib/patient-monitoring.ts`
- `lib/patient-report.ts`
- `app/api/patient/reports/route.ts`
- a tela de relatórios do app
- `__tests__/wearables/a-falha-nao-e-ausencia.test.ts` (novo)

## Critérios de aceite

- [ ] Com uma leitura a rejeitar, `getMonitoringData` devolve `naoLidos` com o
      nome dela, e não uma lista vazia silenciosa
- [ ] O papel gerado nesse estado contém a ressalva, nas duas línguas
- [ ] O papel **sem** falhas não contém a ressalva (senão vira ruído fixo)
- [ ] A lista de relatórios responde 503 quando o banco falha, e `[]` só quando
      de facto não há
- [ ] Mutação: trocar o 503 de volta por `[]` mata um teste nomeado
