# T-3: Decisão de bilíngue na criação

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Fechar a Suposição 2 do `plan.md` — se o relatório deve gerar PT+EN sempre na criação, ou continuar
sob demanda (como ficou depois da atividade 065 T-2). Esta tarefa só implementa algo se a resposta
do Bruno for "gerar os dois sempre" — se ele confirmar que sob-demanda já basta, a tarefa fecha sem
mudança de código, só com a decisão registrada aqui.

## Contexto
Ver `plan.md`, Suposição 2. Hoje (pós atividade 065): `narrativeEn`/`suggestions`/`gaps` são
gerados na criação; `narrativePt`/`suggestionsPt`/`gapsPt` só quando alguém troca o toggle pra PT
na tela (uma chamada de IA a mais, on-demand, idempotente). Gerar os dois sempre na criação dobra o
custo de IA por relatório (toda triagem gera 2 chamadas de síntese em vez de 1 + tradução
condicional).

## Passos (só se a resposta for "sempre os dois")
1. `lib/evidence-report.ts`, `generateEvidenceReport` — depois de montar `parsed` (resposta em
   inglês), reaproveitar a mesma lógica de tradução já existente (a rota
   `POST .../evidence-report {action:"translate"}`, ou extrair essa lógica pra uma função
   compartilhada) pra preencher `narrativePt`/`suggestionsPt`/`gapsPt` na mesma execução do job,
   antes de marcar `status: DRAFT`.
2. Considerar se isso deve rodar em série (mais simples, relatório demora mais pra ficar pronto) ou
   em paralelo com a chamada em inglês (mais rápido, mas exige que o prompt de tradução não dependa
   do resultado em inglês já estar salvo no banco — hoje ele lê `narrativeEn` do banco, precisaria
   ser adaptado pra receber o texto direto em memória).

## Arquivos afetados
- `lib/evidence-report.ts`
- Possivelmente `app/api/admin/patients/[id]/evidence-report/route.ts` (extrair a lógica de
  tradução pra um helper compartilhado, se for reaproveitada aqui)

## Critérios de aceite
- [x] Suposição 2 respondida — sem objeção explícita do Bruno à recomendação registrada no
      `plan.md` ("recomendo MANTER sob demanda"), e autorização geral pra seguir com as
      recomendações documentadas enquanto avança a atividade ("vai dando sequência até terminar").
      Decisão: **continuar sob demanda** (comportamento já entregue na atividade 065 T-2).
- [x] Se "continuar sob demanda": nenhuma mudança de código — confirmado, nada foi alterado por
      esta tarefa.

## Decisão registrada

Mantido sob demanda. Motivo: dobrar o custo de IA por relatório (2 chamadas de síntese sempre, em
vez de 1 + tradução condicional) não se justifica agora que o sob-demanda já traduz tudo de uma vez
(resumo + sugestões + lacunas, atividade 065 T-2) — a diferença prática pro Bruno é só "o PT leva
alguns segundos a mais na primeira vez que ele troca o toggle", não "PT não funciona". Se o uso real
mostrar que isso incomoda (ex. ele quase sempre olha em PT primeiro), revisitar é uma mudança
pequena e isolada (ver "Passos" acima, ainda válidos se a decisão mudar no futuro).
