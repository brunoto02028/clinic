# Atividade 42 — Protocolo por semana + checklist diário com histórico

## Objetivo

A paciente (e qualquer paciente com protocolo atribuído) vê o plano de tratamento agrupado
por semana (Semana 1, Semana 2...), e consegue marcar "fiz hoje" em cada item do dia — isso
fica registrado com data, formando um histórico de adesão que o admin também vê.

**Urgente:** usuário vai usar isso com a paciente ainda hoje — escopo mínimo que funcione bem,
não um redesenho grande.

## Contexto

- `ProtocolItem` já tem `startWeek`/`endWeek` e `hiddenFromPatient` (ativ. de hoje mais cedo).
- Vídeo por exercício **já existe** (`Exercise.videoUrl`, sobe em Clinical → Exercises) — fora
  de escopo, nada a fazer.
- Hoje o único rastro de execução é `ExercisePrescription.completedCount` (contador) e
  `lastCompletedAt` (só a última vez) — sem histórico por dia.
- Tela do paciente: `app/dashboard/treatment/page.tsx`. Tela do admin:
  `app/admin/patients/[id]/page.tsx` (aba Protocol).
- API do paciente: `app/api/patient/protocol/route.ts`. API do admin:
  `app/api/admin/patients/[id]/protocol/route.ts`.

## Decisões de design

1. **Novo model** `ExerciseCompletionLog`:
   - `id`, `protocolItemId` (FK → `ProtocolItem`, cascade delete), `patientId` (FK → `User`),
     `completedDate DateTime @db.Date` (o dia marcado, sem hora), `createdAt`.
   - `@@unique([protocolItemId, patientId, completedDate])` — marcar de novo no mesmo dia não
     duplica (idempotente).
   - Um item já é específico de uma faixa de semanas (cada fase tem sua própria linha de
     `ProtocolItem`, mesmo repetindo o mesmo exercício) — então logar por `protocolItemId`
     já basta, sem precisar linkar em `ExercisePrescription` também.
2. **API do paciente** — estender `app/api/patient/protocol/route.ts`:
   - `POST` com `{ action: "toggleLog", itemId, date? }` (default: hoje, fuso `Europe/London`)
     — cria o log se não existir, remove se já existir (toggle simples).
   - `GET` do protocolo passa a incluir, por item, as datas já marcadas (últimos 14 dias basta
     pra semana atual + anterior).
3. **UI do paciente** (`app/dashboard/treatment/page.tsx`):
   - Itens agrupados por `startWeek`–`endWeek` em vez de lista sequencial por fase — títulos
     "Week 1", "Week 2" etc. (ou "Semana 1" em PT).
   - Cada item da **semana atual** (calculada a partir de `protocol.startDate`) ganha uma tira
     de 7 dias (Seg–Dom) com toggle — clicar marca/desmarca "fiz hoje" (ou aquele dia, dentro
     da semana atual apenas, pra não reescrever histórico antigo por engano).
   - Semanas passadas/futuras continuam na lista, mas sem os toggles (só leitura).
4. **UI do admin** (aba Protocol, `app/admin/patients/[id]/page.tsx`):
   - Cada item mostra as datas já marcadas (ex: "14/09, 15/09") ou um contador "2/7 esta
     semana" — lista simples, sem calendário visual nessa primeira versão.

## Fora de escopo (nesta atividade)

- Vídeo por exercício (já existe).
- Calendário visual completo pro admin (fica só lista/contador por enquanto).
- Editar/apagar um dia marcado fora da semana atual pela paciente (evita reescrever histórico
  por engano — se precisar corrigir, é o admin que ajusta, ação futura).
- Notificação/lembrete diário pra paciente marcar (fora de escopo, pode virar outra atividade).

## Tarefas

| Tarefa | Nome | Status |
|---|---|---|
| T-1 | Schema: `ExerciseCompletionLog` | concluído |
| T-2 | API: toggle diário + incluir log no GET do protocolo (paciente e admin) | concluído |
| T-3 | UI paciente: agrupar por semana + tira de 7 dias na semana atual | concluído (2 rodadas de bugs reais achados pelo QA e corrigidos: timezone deslocando o dia, e semana errada em seções multi-semana) |
| T-4 | UI admin: mostrar histórico/adesão por item na aba Protocol | concluído (bug real achado pelo QA: a tela do admin lê de `/api/admin/patients/[id]`, não da rota `/protocol` — corrigido) |

## Achado extra fora do escopo original, corrigido na mesma leva

A aba Protocol do admin (`app/admin/patients/[id]/page.tsx`) lia protocolos de uma rota
diferente da que a tela de verdade usa — `app/api/admin/patients/[id]/protocol/route.ts`
(que eu tinha atualizado) não é a mesma que `app/api/admin/patients/[id]/route.ts` (que a
tela realmente consome). Corrigido incluindo `completionLogs` também nessa segunda rota.

## Suposições (validar com o usuário)

- Fuso horário `Europe/London` pra definir "o dia de hoje" (clínica é no Reino Unido).
- Só a semana ATUAL fica editável pela paciente — semanas passadas ficam congeladas (leitura).
- "Semana 1" começa em `protocol.startDate`, não na data real da cirurgia — como a Ana Livia
  está reiniciando adaptativamente, isso já bate com a intenção (semana 1 = hoje em diante).
