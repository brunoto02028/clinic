# QA — Atividade 43: Unificar tela de exercícios do paciente

## T-1: Schema

- **API** — Criar log com `exercisePrescriptionId` preenchido (`protocolItemId: null`) e outro com
  `protocolItemId` preenchido (`exercisePrescriptionId: null`) — os dois convivem sem erro.
- **API** — Duplicar o mesmo `exercisePrescriptionId`+`patientId`+`completedDate` → a constraint
  única rejeita.

## T-2: API toggle unificado + GET

- **API** — `PATCH /api/exercises` numa prescrição sem log ainda → cria, resposta de sucesso.
- **API** — `PATCH /api/exercises` de novo, mesma prescrição/dia → remove (desmarca).
- **API** — `PATCH /api/exercises` numa `prescriptionId` de outro paciente → erro, nenhum log
  criado.
- **API** — `GET /api/exercises` (paciente) inclui as datas certas por prescrição após marcar
  2-3 dias.
- **API** — `GET /api/admin/exercise-prescriptions` inclui as mesmas datas.

## T-3: UI — card "Hoje" + exercícios soltos

- **UI** — Paciente COM protocolo (ex: Ana Livia): card "Hoje" no topo mostra os itens da semana
  atual do protocolo; marcar feito ali reflete na tira de dias da seção de semana correspondente
  (mesmo dado, duas vistas).
- **UI** — Paciente SÓ com prescrições soltas (sem `TreatmentProtocol`): abrir
  `/dashboard/treatment` mostra o card "Hoje" com as prescrições soltas + seção "Exercícios
  Gerais" com a tira de 7 dias — sem erro, sem seção de semana vazia/quebrada.
- **UI** — Marcar feito no card "Hoje" (um item de protocolo e um solto) — sem erro no console,
  cada um grava no lugar certo (`ExerciseCompletionLog` com o FK certo).
- **UI** — Rótulo mudou: nenhum "Done Nx" ou "Completed 1x" sobrando — mostra "X/7 dias esta
  semana" (ou equivalente) nos dois tipos.
- **UI** — Responsivo em ~390px: card "Hoje" e seção "Exercícios Gerais" não quebram o layout.

## T-4: Aposentar "My Exercises"

- **UI** — Menu lateral do paciente não mostra mais "Exercises"/"Exercícios" separado.
- **UI** — Acessar `/dashboard/exercises` direto → redireciona pra `/dashboard/treatment`, sem
  404.
- **API** — Link gerado por `app/api/cron/exercise-reminders/route.ts` (ou notificação
  equivalente) aponta pra `/dashboard/treatment`.

## T-5: Admin — histórico de prescrições soltas

- **UI** — Aba Exercises da ficha do paciente mostra as datas marcadas por prescrição, batendo
  com o que a paciente marcou.
- **UI** — Prescrição sem log nenhum não quebra o layout.
