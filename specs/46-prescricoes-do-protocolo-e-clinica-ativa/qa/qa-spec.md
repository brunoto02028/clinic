# QA — Atividade 46: Prescrições presas ao protocolo + tudo na clínica ativa

Ambientes: local (contas `qa.*@example.test` do fixture de tenants) e produção após o deploy
(SUPERADMIN admin@bpr.clinic). Pacientes de teste descartáveis `qa.ativ46.*@example.test`, apagados
ao final. A clínica "Bruno" (personal, já existente) faz o papel de "outra clínica" via "Active
Clinic", que volta ao estado original (`null`) no fim. Nunca alterar dados da Ana — só leitura.

## T-1: Prescrições presas ao protocolo
- **API** — Atribuir o ACL com Weeks 1–2 a paciente de teste → prescrições com `protocolId`;
  paciente logado vê só os exercícios da semana liberada (`/api/exercises`, sino).
- **API** — Arquivar o protocolo (`edit_protocol` status ARCHIVED) → paciente não vê nenhuma das
  prescrições dele; restaurar (SENT) → volta a ver só as das semanas liberadas.
- **API** — Voltar o protocolo para DRAFT → idem arquivado.
- **API** — Prescrição manual (`POST /api/admin/exercise-prescriptions`) de outro exercício → aparece
  mesmo com o plano arquivado.
- **Dados** — Backfill: contagem logada; prescrições da Ana todas ligadas (leitura); 2ª execução
  sem mudanças (local).
- **Leitura** — Ana: itens e exercícios visíveis antes do deploy = depois (via "View as Patient"
  só leitura ou dados do admin).
- **Unit** — regra vinculada/avulsa, arquivado, restaurado, pacote não pago; assign grava
  `protocolId`.

## T-2: Pacientes na clínica certa
- **API (local)** — `qa.fisioa` (clínica A) → `GET /api/patients?clinicId=<clínica B>` → só
  pacientes da A; `GET /api/admin/patients` → só da A.
- **API (prod)** — SUPERADMIN padrão → listas só com pacientes da BPR; Active Clinic = "Bruno" →
  só alunos dessa clínica; `?clinicId=<BPR>` pelo SUPERADMIN → BPR.
- **API** — Paciente criado com Active Clinic = "Bruno" nasce nessa clínica (apagar em seguida).
- **API** — Conta de paciente → 403 nas duas listas.
- **UI** — Lista de pacientes (/admin/patients) e janela de atribuição abrem normalmente; sem erro
  no console.
- **Unit** — casos da T-2.

## T-3: Biblioteca na clínica ativa
- **API (prod)** — BPR: `GET /api/admin/exercises?all=true` com a mesma contagem de antes do deploy.
- **API (prod)** — Active Clinic = "Bruno": lista só exercícios dessa clínica; `GET/PATCH` de
  exercício da BPR → 404; pastas só dessa clínica.
- **UI** — Clinical → Exercises abre com a BPR; seletor de exercício da aba Protocol busca
  normalmente.
- **Unit** — casos da T-3.

## T-4: Teste alinhado
- **Unit** — `npx jest` sem falhas.
