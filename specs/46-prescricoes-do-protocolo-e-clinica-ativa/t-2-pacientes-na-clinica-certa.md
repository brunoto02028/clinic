# T-2: Listas e cadastro de pacientes na clínica certa + vazamento `?clinicId`

**Status:** concluído
**Depende de:** nenhuma

## Objetivo
Nenhum profissional lista pacientes de outra clínica; o SUPERADMIN vê os pacientes da clínica
ativa; paciente novo nasce na clínica ativa.

## Contexto
plan.md, decisão 4. `GET /api/patients?clinicId=X` hoje devolve pacientes da clínica X para
qualquer staff.

## Passos
1. `app/api/patients/route.ts` (GET): `getActor` → staff obrigatório; clínica = `actor.clinicId`;
   `?clinicId=` só aceito para SUPERADMIN; sem clínica → 403. Manter o fallback de dev.
2. `app/api/admin/patients/route.ts`:
   - GET: mesma resolução (sem clínica → 403), mantendo busca, letra e limite;
   - POST: paciente criado em `actor.clinicId` (e o limite de pacientes checado nessa clínica).
3. Conferir as telas que usam as duas rotas (lista de pacientes, agenda, financeiro, tarefas,
   janela de atribuição…) — só muda o conteúdo da lista, não o formato.
4. Testes de rota: terapeuta com `?clinicId` de outra clínica → só a própria; SUPERADMIN com
   Active Clinic → a ativa; SUPERADMIN com `?clinicId` → a pedida; staff sem clínica → 403;
   paciente → 403; POST cria na clínica ativa.

## Arquivos afetados
- `app/api/patients/route.ts`
- `app/api/admin/patients/route.ts`
- `__tests__/tenant/` (novo teste)

## Critérios de aceite
- [x] Staff de uma clínica com `?clinicId=<outra>` → recebe só os pacientes da própria clínica
- [x] SUPERADMIN: lista = clínica ativa (padrão BPR); trocando para "Bruno" → alunos dessa clínica
- [x] Paciente criado pelo SUPERADMIN com Active Clinic = X nasce na clínica X
- [x] Telas que usam as listas continuam funcionando (lista de pacientes, janela de atribuição, agenda)
