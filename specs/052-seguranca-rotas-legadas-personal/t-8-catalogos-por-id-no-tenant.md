# T-8: Catálogos e listas por id presos ao tenant

**Status:** pendente
**Depende de:** nenhuma

## Objetivo
Rotas de catálogo que editam/leem por id passam a exigir que o registro seja do tenant de quem chama. Listas que hoje devolvem dados de toda a plataforma passam a filtrar por tenant.

## Contexto
Da auditoria de 18/09. Todas exigem o id, mas esses ids vazam pelas listagens abertas (fechadas em T-2/T-5/T-6):

| Rota | Problema |
|---|---|
| `app/api/admin/rehab-plans/recent/route.ts:13-33` | lista os 20 rehab plans mais recentes **da plataforma** (paciente, queixa, região, gravidade) |
| `app/api/admin/achievements/route.ts:80`, `conditions/route.ts:77`, `quizzes/route.ts:90` | update por id espalhando `data`, então dá até para trocar o `clinicId` |
| `app/api/admin/journey/challenges/route.ts:87,106`, `journey/products/route.ts:183,256` | por id, sem tenant |
| `app/api/admin/treatment-types/[id]/route.ts:18,55` | preço e duração de outro tenant |
| `app/api/admin/equipment/[id]/route.ts:19` (GET), `exercises/[id]/route.ts:27` (GET), `exercises/translate/route.ts:73-86` | leitura/tradução de item de outro tenant |

## Passos
1. `rehab-plans/recent`: filtrar por `clinicId` do actor. SUPERADMIN: tenant ativo.
2. Cada update/delete por id: `where: { id, clinicId: actor.clinicId }` (ou `findFirst` + 404). Nunca espalhar o corpo inteiro no `data`: lista branca de campos, e `clinicId` nunca vem do corpo.
3. GETs por id de equipment/exercises e `exercises/translate`: mesmo filtro.
4. Onde o catálogo for **global de propósito** (`clinicId: null`, compartilhado), escrita só para SUPERADMIN, igual à T-2.

## Arquivos afetados
- `app/api/admin/rehab-plans/recent/route.ts`
- `app/api/admin/achievements/route.ts`, `conditions/route.ts`, `quizzes/route.ts`
- `app/api/admin/journey/challenges/route.ts`, `journey/products/route.ts`
- `app/api/admin/treatment-types/[id]/route.ts`
- `app/api/admin/equipment/[id]/route.ts`, `app/api/admin/exercises/[id]/route.ts`, `app/api/admin/exercises/translate/route.ts`

## Critérios de aceite
- [ ] Personal B → `rehab-plans/recent` → só do B (vazio no QA Studio PT).
- [ ] Personal B → update/delete por id de achievement/condition/quiz/journey/treatment-type do A → 404; banco inalterado.
- [ ] Update com `clinicId` no corpo → campo ignorado.
- [ ] Personal B → `GET exercises/<id do A>` e `equipment/<id do A>` → 404; `exercises/translate` com id do A → nada traduzido.
- [ ] Clínica BPR: editar os próprios catálogos funciona (regressão).
