# QA — Atividade 45: Templates por clínica + atribuição segura e semana a semana

Ambiente: produção após deploy, sessão SUPERADMIN (admin@bpr.clinic). Pacientes de teste
descartáveis (`qa.ativ45.*@example.test`), apagados ao final com as consultas geradas. Para testar
"outra clínica" sem criar uma clínica nova: usar o seletor "Active Clinic" do SUPERADMIN
(`POST /api/admin/switch-clinic`) apontando para a clínica "Bruno" (personal trainer) que já
existe, e voltar para a BPR ao final — personal trainers são bloqueados das rotas de protocolo por
papel, não por clínica, então o SUPERADMIN consegue exercitar o filtro por clínica. Nunca alterar
dados da paciente real.

## T-1: Templates por clínica
- **API** — Após o deploy: `GET /api/admin/protocols` (BPR) lista os 4 templates, todos com
  `clinicId` = BPR.
- **API** — Active Clinic = "Bruno": `GET /api/admin/protocols` → lista vazia; `GET/PATCH/DELETE`
  do template ACL → 404; nada muda (conferir voltando à BPR).
- **API** — `POST /api/admin/protocols` (BPR) → template nasce com `clinicId` da BPR (apagar
  depois).
- **API** — `POST` de template com item cujo `exerciseId` é inexistente → item gravado sem vínculo.
- **Unit** — testes do helper e das rotas passando.
- **Log** — backfill registrou a atualização no primeiro boot e 0 no seguinte (via `/api/health`
  ou log disponível; se não houver acesso a log, confirmar pelo estado dos dados).

## T-2: Atribuição segura
- **API** — Active Clinic = "Bruno": assign do ACL a paciente de teste da BPR → 404 (template e
  paciente fora), nenhum protocolo criado.
- **Unit** — paciente de outra clínica → 404; exercício de outra clínica com/sem equivalente por
  nome → ligado ao da clínica / sem vínculo + `unlinkedExercises`.
- **API** — assign normal (BPR) → 201, protocolo com 41 itens ligados, `unlinkedExercises: 0`.

## T-3: Atribuição semana a semana (API)
- **API** — `visibleThroughWeek: 2` → paciente recebe só itens com semana inicial 1–2.
- **API** — sem `visibleThroughWeek` → tudo visível.
- **API** — paciente de teste com `preferredLocale` pt-BR, sem `language` → protocolo em
  português; en-GB → inglês.
- **API** — atribuir o mesmo template de novo → 409 com a lista; `onExisting: "archive"` → antigo
  ARCHIVED, novo criado; `onExisting: "keep"` → dois ativos.

## T-4: Janela de atribuição
- **UI** — Página de templates → Assign → paciente de teste → padrões (idioma do paciente, Weeks
  1–2) → protocolo criado com semanas 1–2 visíveis.
- **UI** — Ficha do paciente de teste → aba Protocol → "Assign template" → escolher ACL → idem;
  aba mostra o protocolo novo sem recarregar a página.
- **UI** — Repetir com o mesmo template → aviso com o protocolo existente; "Archive the old one and
  assign" arquiva o antigo; "Assign anyway" mantém os dois.
- **UI** — ~390px sem quebra; sem erro no console.

## T-5: `sentToPatientAt` e duplicar
- **API** — `edit_protocol` num protocolo enviado → `sentToPatientAt` igual ao de antes.
- **API/UI** — duplicar item com exercício da clínica → cópia ligada.
- **Unit/UI** — duplicar item cuja API responde "Exercise not found in this clinic" → cópia sem
  vínculo + aviso (simulado interceptando a resposta no navegador, já que não há exercício de fora
  em produção).
