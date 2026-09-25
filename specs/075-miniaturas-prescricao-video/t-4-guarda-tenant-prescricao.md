# T-4: Backend — prescrição recusa exercício de outra clínica

**Status:** concluído
**Depende de:** nenhuma (mas nasceu da T-2, que passou a usar este caminho)

## Objetivo

`POST /api/admin/exercise-prescriptions` passa a verificar que todo
`exerciseId` recebido pertence à clínica de quem chama.

## Contexto

O endpoint tem dois caminhos. O de **pasta** (`folderId`) resolve os
exercícios ele mesmo, com `clinicId` no `where` — sempre foi seguro. O de
**lista** (`exercises: [{exerciseId}]`) gravava o que recebesse: usava o
`clinicId` de quem chamava, mas aceitava o `exerciseId` do corpo sem
conferir a dona.

Na prática: alguém da clínica A que soubesse o id de um exercício da
clínica B conseguia prescrevê-lo ao próprio paciente — e o vídeo da B
realmente chegava à paciente da A.

Pré-existente, não introduzido por esta atividade (a Biblioteca de
Exercícios já usava esse caminho). Entrou aqui porque a T-2 passou a
usá-lo também, e o Bruno pediu pra fechar junto em vez de deixar pra
depois.

Recusa devolve **404 "Exercise not found"**, igual a um id inexistente —
mesma regra do resto da base (`lib/staff-patient-access.ts`: *"Records of
another tenant answer exactly like missing ones, so their existence isn't
revealed"*). É tudo ou nada: uma lista com um id legítimo e um alheio não
grava nem o legítimo.

## Passos

1. Rejeitar entrada sem `exerciseId` string (400).
2. Deduplicar os ids pedidos — o mesmo id duas vezes é pedido inofensivo,
   não motivo pra recusar.
3. Conferir que todos pertencem ao `clinicId` de quem chama; se faltar
   algum, 404 sem gravar nada.

## Arquivos afetados

- `app/api/admin/exercise-prescriptions/route.ts`
- `scripts/qa/qa075-verify-tenant-guard.cjs` (verificação)

## Critérios de aceite

- [x] Exercício de outra clínica → 404, nada gravado.
- [x] Resposta não revela que o exercício existe.
- [x] Lista mista (um próprio + um alheio) recusada inteira.
- [x] Id inexistente tratado igual ao de outra clínica.
- [x] Entrada sem `exerciseId` → 400.
- [x] Exercício da própria clínica continua prescrevendo normalmente.
- [x] Id repetido é aceito, não confundido com payload inválido.
- [x] Caminho de pasta inteira inalterado.

## Verificação

`node scripts/qa/qa075-verify-tenant-guard.cjs` → **11/11**, fixtures
próprias criadas e removidas (`leftovers: todos 0`).

```
[PASS] Refuses another clinic's exercise — status 404 {"error":"Exercise not found"}
[PASS] Nothing was written by the refused request
[PASS] Answer does not reveal that the exercise exists
[PASS] Mixed list is refused whole
[PASS] Mixed list wrote nothing — not even the legitimate one
[PASS] Unknown id refused the same way
[PASS] Entry without exerciseId → 400
[PASS] Own exercise still prescribes — status 201, count 1
[PASS] Row is the right exercise, with the batch frequency
[PASS] Duplicate id is accepted, not refused
[PASS] Whole-folder path still works
```
