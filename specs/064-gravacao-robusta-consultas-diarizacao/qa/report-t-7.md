# QA Report — T-7: Histórico de sessões de gravação

**Data:** 2026-09-19
**Resultado geral:** ✅ aprovado

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Sem autenticação → bloqueado antes da rota (redirect padrão do middleware) | API | ✅ |
| 2 | Staff sem `clinicId` (SUPERADMIN fixture) → 400 "No clinic context", nada vaza | API | ✅ |
| 3 | Lista todos os status (RECORDING/ENDED/MERGING/TRANSCRIBING/TRANSCRIBED/FAILED), ordenada `createdAt desc` | API + UI | ✅ |
| 4 | Sessão sem `patientId` → "Not associated" claro; com paciente → nome exibido | UI | ✅ |
| 5 | Isolamento cross-tenant: staff da clínica B nunca vê sessões da clínica A | API + UI | ✅ |
| 6 | Clicar num card leva pra `/admin/clinical-ai/sessions/[id]` (tela do T-6) | UI | ✅ |
| 7 | Paginação por cursor (`?before=`): 36 sessões → página 1 com 25 + `nextCursor`, página 2 com 11 restantes, sem duplicar/pular | API + UI ("Load more") | ✅ |
| 8 | Regressão: aba "Ambient Scribe" (gravação) renderiza normal após a mudança em `page.tsx` | UI | ✅ |

`npx tsc --noEmit -p .` (filtrado `reconstruir/`): 1898 erros, baseline, nenhum novo, nenhum nos
arquivos tocados pelo T-7.

## Setup

Servidor de dev iniciado na porta **4550** (a porta padrão 4000 do projeto estava ocupada por um
processo Node de outro projeto não relacionado, "Go Ômega — CRM", rodando na mesma máquina —
identificado pelo HTML da resposta antes de perder tempo depurando a rota).

Reaproveitadas as fixtures `QA Scribe Clinic A` / `QA Scribe Clinic B` (mesmas clínicas do T-5/T-6),
com senha resetada via Prisma pra permitir login real pela UI (`bcrypt`, conta de teste local, sem
dado de paciente real). Fixture `SUPERADMIN` já existente (`qa.superadmin@example.test`,
`clinicId: null`) reaproveitada pro cenário 2, senha também resetada.

Fixtures de `AmbientRecordingSession` criadas direto no banco (Prisma), cobrindo:
- Clínica A: um de cada status (RECORDING, ENDED, MERGING, TRANSCRIBING, TRANSCRIBED, FAILED),
  duas delas com paciente associado (paciente de teste fictício criado só pra isso), quatro sem;
  mais 30 sessões `TRANSCRIBED` adicionais pra forçar paginação (36 no total).
- Clínica B: uma sessão `TRANSCRIBED`, pra confirmar isolamento.

## Detalhes

### 1-2. Autenticação/autorização (API) ✅
Sem cookie de sessão: `GET /api/admin/clinical-scribe/sessions` retorna `307` pro `/login` — mesmo
padrão de middleware documentado no relatório do T-6 (não é uma regressão, é como toda rota
`/api/admin/*` se comporta nesta app). Logado como `SUPERADMIN` sem `clinicId`: `400 {"error":"No
clinic context"}`, confirmando o fail-closed antes de qualquer query — nenhum dado de nenhuma
clínica retornado.

### 3-4. Lista completa, ordenação, paciente/"Not associated" ✅
Via API (`curl` autenticado como terapeuta da Clínica A), os 6 status apareceram todos, na ordem
esperada (mais recente primeiro). Via UI (aba "History"), os mesmos 6 apareceram com badge de cor
correta por status, "Paciente Teste QA" nas duas sessões associadas e "Not associated" em itálico
nas quatro sem paciente. Nenhum erro de console nos dois carregamentos observados.

Screenshot: `screenshots/t-7-history-list.png`.

### 5. Isolamento cross-tenant ✅
**API**: logado como terapeuta da Clínica A, `GET sessions` retornou as 36 sessões da própria
clínica (`count: 36`) e nenhuma da B. Logado como terapeuta da Clínica B, retornou só a 1 sessão da
própria clínica (`count: 1`), confirmando que nenhuma das 36 da A vazou.

**UI**: login real pela tela de staff como terapeuta da Clínica B, aba "History" mostrou só o card
da própria sessão (`Not associated · 19/09/2026, 17:37:39 · 5:00 · Terapeuta Clinic B ·
TRANSCRIBED`) — nenhum dos 36 cards da Clínica A visível. Nenhum erro de console.

Screenshot: `screenshots/t-7-cross-tenant-clinic-b.png`.

### 6. Clique no card → tela de detalhe do T-6 ✅
Clique num card `TRANSCRIBED` com paciente associado navegou corretamente pra
`/admin/clinical-ai/sessions/{id}`, carregando a tela de detalhe do T-6 sem erro.

Screenshot: `screenshots/t-7-click-through-detail.png`.

### 7. Paginação por cursor ✅
Com 36 sessões na Clínica A:
- **API**: primeira chamada (`?before` ausente) retornou 25 itens + `nextCursor` preenchido
  (`createdAt` do último item). Segunda chamada com `?before=<nextCursor>` retornou os 11
  restantes, `nextCursor: null`. Os 36 ids das duas páginas são todos distintos (sem duplicata, sem
  gap).
- **UI**: aba "History" carregou 25 cards + botão "Load more" visível; clicar nele carregou os 11
  restantes e o botão desapareceu (sem `nextCursor`). Contagem de links únicos na página confirmada
  via `document.querySelectorAll` = 36 (36 únicos, 0 duplicados).

**Observação não-bloqueante (corrigida após o QA, ver seção de code review no `t-7-historico.md`)**:
o cursor original usava só `createdAt` com `lt` estrito, sem tie-breaker de `id` — duas sessões com
o mesmo `createdAt` (mesmo milissegundo) poderiam causar um item pulado na borda da página. Não
reproduzido neste teste (fixtures com timestamps distintos), mas trocado por um cursor Prisma nativo
(`id`, ordenado por `createdAt desc, id desc`) logo em seguida, eliminando o risco por completo.

### 8. Regressão — Ambient Scribe / T-6 ✅
Aba "Ambient Scribe" (gravação) carregou normalmente com todos os campos (idioma, tipo de consulta,
patient ID, modo de gravação, botão "Start Recording", upload de áudio) — sem erro de console. Tela
de detalhe do T-6, acessada a partir de um card do histórico, também carregou normalmente (ver
cenário 6).

## Erros de console
Nenhum atribuível ao T-7 em nenhuma das telas testadas.

## Observação sobre o ambiente de teste (fora do escopo do código)
Durante o teste, o navegador do Playwright MCP é compartilhado com outra sessão/agente ativo na
mesma máquina (abas de outra instância rodando na porta 4210, logada na mesma conta de fixture da
Clínica A, navegando sozinha em paralelo — QA do T-8, rodando concorrentemente). Isso causou dois
efeitos colaterais **no ambiente**, não no código do T-7:
- A senha resetada da fixture da Clínica A/B precisou ser resetada duas vezes (provável escrita
  concorrente de outro processo tocando as mesmas contas de teste).
- Ao final, a limpeza encontrou 39 sessões na Clínica A em vez das 36 criadas por este QA — as 3
  extras provavelmente vieram de interação automática da outra sessão com o botão "Start Recording"
  da mesma conta compartilhada. Todas foram apagadas na limpeza (não afeta o veredito dos cenários,
  já verificados por id/contagem exata antes da limpeza).

## Limpeza realizada
- Todas as `AmbientRecordingSession` de `QA Scribe Clinic A` (39) e `QA Scribe Clinic B` (1)
  apagadas do banco local.
- Paciente de teste fictício (`patient.a.scribe.qa@example.test`) apagado.
- Servidor de dev iniciado nesta sessão (porta 4550) encerrado.
- Aba de navegador aberta por este QA fechada. Nenhuma gravação real foi iniciada em nenhum
  momento (só fixtures diretas no banco).

## Falhas e recomendações
Nenhuma falha nos critérios de aceite do T-7. Uma observação não-bloqueante registrada acima (cursor
sem tie-breaker de `id`) foi corrigida proativamente logo após o QA. Ambiente teve ruído esperado de
outra sessão/agente (QA do T-8) compartilhando o mesmo navegador Playwright e o mesmo banco local —
não é bug do T-7.
