# T-5: Tarefas em massa (`patient-tasks`) presas à clínica de quem chama

**Status:** concluído (QA aprovado `qa/report-t-5.md` + code review aplicado)
**Depende de:** nenhuma

## Objetivo
A lista de tarefas e o envio "para todos" só enxergam os pacientes/alunos do tenant de quem chama. É a mesma classe do incidente de broadcast de 11/09/2026.

## Contexto
`app/api/admin/patient-tasks/route.ts`:
- **GET (:22-30):** sem filtro de tenant, `limit` livre → o personal lista tarefas de todos os tenants, com nome e e-mail do paciente.
- **POST com `audience: "all"` (:77-82):** busca **todos os PATIENT ativos da plataforma** e dispara tarefa (e-mail/WhatsApp/push) com `actionUrl` livre.

A correção de broadcast (`/api/admin/broadcasts`) é o padrão a seguir.

## Passos
1. `GET`: `where: { patient: { clinicId: actor.clinicId } }` (ou equivalente) e `limit` com teto (ex.: 200). SUPERADMIN: tenant ativo, não a plataforma inteira.
2. `POST`:
   - `audience: "all"` → só PATIENT do `clinicId` do actor;
   - `audience` com ids específicos → cada id validado como do tenant (ids de fora são rejeitados, não ignorados em silêncio).
3. `actionUrl`: aceitar só caminho interno (`/dashboard/...`) ou domínio da própria plataforma. Recusar URL externa, pra evitar phishing com a marca do estúdio.
4. Conferir `PATCH`/`DELETE` por id (se existirem) → tenant do actor.

## Arquivos afetados
- `app/api/admin/patient-tasks/route.ts` (+ `[id]` se houver)

## Critérios de aceite
- [x] Personal B: `GET ?limit=100000` → só tarefas de alunos do B; resposta limitada ao teto.
- [x] Personal B: `POST {"audience":"all"}` → destinatários = só alunos ativos do B (verificado nos registros criados, **com envio real desligado**).
- [x] Personal B: `POST` com `patientIds` contendo paciente do A → 400/404, nada criado.
- [x] `actionUrl: "https://phish.example"` → 400.
- [x] Clínica BPR: criar tarefa para um paciente e para "todos" continua funcionando dentro da clínica (regressão).
