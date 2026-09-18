# T-2: Atribuição segura

**Status:** concluído
**Depende de:** T-1

## Objetivo
`POST /api/admin/protocols/[id]/assign` só atribui template da clínica, a paciente da clínica, e
nunca liga exercício de outra clínica.

## Contexto
Ver plan.md, decisões 2 e 3. Hoje a rota usa só a sessão (role) e a clínica do paciente como
fallback, sem comparar com a de quem chama.

## Passos
1. `staffPatientAccess(req, patientId)` antes de tudo (404 "Patient not found" se não for da
   clínica); clínica do protocolo = `actor.clinicId`.
2. Template via `templateInTenant(params.id, actor.clinicId)` → 404 se não for da clínica.
3. Exercícios: montar o conjunto de `exerciseId` dos itens do template; buscar os que são da
   clínica; para os de fora, procurar na biblioteca da clínica um exercício ativo com o mesmo
   `name` (sem diferenciar maiúsculas); se não achar, o item fica sem vínculo. Usar esse mapa tanto
   nos itens do protocolo quanto nas prescrições criadas.
4. Resposta inclui `unlinkedExercises` (quantos itens ficaram sem vínculo por não existir na
   clínica).
5. Testes com Prisma mockado: paciente de outra clínica, template de outra clínica, exercício de
   outra clínica com e sem equivalente por nome.

## Arquivos afetados
- `app/api/admin/protocols/[id]/assign/route.ts`
- `__tests__/protocol/assign-route.test.ts` (novo)

## Critérios de aceite
- [x] Paciente de outra clínica → 404, nada criado, nenhuma notificação
- [x] Template de outra clínica → 404
- [x] Exercício de outra clínica com equivalente por nome → item ligado ao da clínica
- [x] Sem equivalente → item sem vínculo, contado em `unlinkedExercises`
- [x] Atribuição normal (BPR → paciente BPR) continua igual
