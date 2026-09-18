# QA — Atividade 44: Controle semana a semana do protocolo no admin

Ambiente: produção (https://bpr.clinic) após deploy, sessão de admin (SUPERADMIN). Usar só
pacientes de teste descartáveis (`qa.ativ44.*@example.test`) com o template ACL atribuído; nunca
alterar dados da paciente real. Apagar tudo ao final (pacientes via `DELETE /api/admin/users/[id]`
e consultas geradas via `DELETE /api/appointments/[id]`). Limpar cache via CDP antes de confiar no
que renderiza.

## T-1: API

- **API** — `PATCH .../protocol` `{ itemId, itemUpdate: { exerciseId: <exercício da clínica> } }` →
  200; `GET` do paciente traz `item.exercise` com esse exercício.
- **API** — mesmo com `exerciseId: null` → 200, `item.exercise` vira null.
- **API** — `exerciseId` inexistente → 400, item inalterado.
- **API** — `exerciseId` de exercício de outra clínica (se existir um em produção; senão, id
  inventado) → 400, item inalterado.
- **API** — `newItem` com `exerciseId` inválido → 400, nenhum item criado (contagem igual).
- **API** — `{ protocolId, bulkHidden: { itemIds: [ids da semana 3-4], hidden: false } }` → 200,
  `count` = nº de ids; `GET` do paciente passa a trazer esses itens.
- **API** — `bulkHidden` incluindo um id de item de OUTRO paciente de teste → esse item não muda.
- **API** — `bulkHidden` com `itemIds: []`, `itemIds` ausente ou `hidden` não booleano → 400.

## T-2: UI — grupos por semana

- **UI** — Aba Protocol mostra grupos "Week 1", "Weeks 1-2", "Weeks 3-4"… (mesmos rótulos da tela
  da paciente), com contagem e estado (Visible / Hidden / Partly visible).
- **UI** — Com semanas ≥3 escondidas: resumo mostra "Patient currently sees: Weeks 1–2".
- **UI** — Clicar "Release week" em "Weeks 3-4" → grupo vira Visible, resumo vira "Weeks 1–4";
  impersonando o paciente, a seção "Weeks 3-4" aparece.
- **UI** — Clicar "Hide week" no mesmo grupo → volta a escondido; a paciente deixa de ver.
- **UI** — Esconder 1 item dentro de um grupo visível → grupo vira "Partly visible" e o botão vira
  "Release week".
- **UI** — Editar / olho / duplicar / apagar dentro de um grupo continuam funcionando.
- **UI** — ~390px: grupos e botões não quebram o layout.

## T-3: UI — form de item + "Add item"

- **UI** — Editar item: mudar start week para 5 e end week para 6, salvar → item aparece no grupo
  "Weeks 5-6".
- **UI** — End week menor que start week → mensagem no form, nada enviado (sem request na aba
  Network).
- **UI** — Buscar exercício pelo nome, selecionar, salvar → item mostra o exercício e "video" /
  "no video" certo.
- **UI** — Ligar a um exercício que tem vídeo, liberar a semana, impersonar → "Watch video" aparece
  no item e no card "Today" (se for semana atual).
- **UI** — "Unlink" → item sem exercício; na tela da paciente some o "Watch video".
- **UI** — "Open in library to add video" abre `/admin/exercises?search=<nome>` com a busca
  preenchida.
- **UI** — "+ Add to this week" em "Weeks 3-4" (escondido) → item novo nasce no grupo, escondido,
  aberto em edição; impersonando, a paciente não vê item novo nenhum.
- **UI** — "+ Add to this week" num grupo visível → item novo continua escondido até clicar no olho
  ou "Release week".

## T-4: status só na primeira vez

- **API/UI** — Protocolo de teste enviado (via assign), sem dias/horário: Edit → mudar título →
  Save → 200, título atualizado.
- **API/UI** — Protocolo de teste enviado com agenda completa (dias + horário + início): anotar
  quantas consultas existem, Edit → mudar resumo → Save → mesma quantidade de consultas.
- **API** — Protocolo em `DRAFT` com agenda completa → `status: SENT_TO_PATIENT` → consultas
  criadas uma vez (como antes).
- **API** — Protocolo em `DRAFT` sem agenda → `status: SENT_TO_PATIENT` → 400 com a mensagem de
  agenda incompleta.
- **API** — Protocolo `ARCHIVED` com agenda completa → `status: SENT_TO_PATIENT` → 200, nenhuma
  consulta criada.

## T-5: UI — arquivados

- **UI** — Paciente de teste com um protocolo ativo e um arquivado: ativo aparece primeiro, igual a
  hoje; arquivado só dentro de "Archived (1)", recolhido.
- **UI** — Expandir "Archived": card com badge "Archived", sem botões de liberar/editar itens.
- **UI** — "Restore" pede confirmação; confirmar → protocolo volta pra lista ativa e a paciente
  volta a vê-lo; nenhuma consulta nova criada.
- **UI** — Cancelar a confirmação → nada muda.
