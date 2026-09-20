# QA Report — ONLINE (produção real, https://bpr.clinic) — Atividade 066

**Data:** 2026-09-20
**Ambiente:** Produção (`https://bpr.clinic`), commit `8637dafd`.
**Resultado geral:** ⚠️ aprovado com ressalvas — a lógica core da atividade (Decisão 0, reconciliação,
observação do fisioterapeuta, link SOAP→Evidence) funciona corretamente em produção, mas foi
encontrado 1 bug real (não introduzido por esta atividade, mas no mesmo código tocado por T-4) que
bloqueia a criação de nota SOAP quando nem todos os campos são preenchidos.

## Metodologia
- Login via browser real (Playwright MCP), sessão já autenticada como Bruno Admin (SUPERADMIN) no
  perfil persistente — passou pelo desafio Cloudflare normalmente.
- Clínica de teste criada via "Active Clinic" switcher (`QA 066 Online Test Clinic A`/`B`) para dar
  ao SUPERADMIN acesso de tenant aos pacientes fictícios (sem isso, `staffPatientAccess` retorna
  404 "Patient not found" mesmo pro platform admin — comportamento correto de isolamento).
- Fixtures/limpeza direto no Postgres de produção via `DATABASE_URL` externo (Coolify
  `external_db_url`), com trava de segurança (`ABORT` se o host não for o de produção) em todos os
  scripts: `scripts/qa/t066-online-fixtures.cjs`, `t066-online-add-patient-d.cjs`,
  `t066-online-baseline.cjs`, `t066-online-inspect.cjs`, `t066-online-cleanup.cjs`.
- Uploads de documento via UI real (formulário "Upload Document"), com PDFs sintéticos mínimos
  (texto fictício, sem dado sensível).
- Só 3 gerações reais de IA no total (todas parte do fluxo natural: 1ª criação do relatório do
  paciente A pela reconciliação, 1 reprocessamento por `needsReprocessing`, 1 geração da versão nova
  pós-aprovação) — nenhuma chamada extra forçada além do necessário para confirmar os cenários.
- `AI_STRICT_MODE` não configurado em produção (confirmado, comportamento aceito/conhecido).

## Resumo
| # | Cenário | Resultado |
|---|---------|-----------|
| Decisão 0.1 — paciente sem relatório + doc relevante → relatório novo | ✅ |
| Decisão 0.2 — relatório não aprovado + doc relevante → mesma linha, `needsReprocessing: true` | ✅ |
| Decisão 0.3 — relatório `APPROVED` + doc relevante → versão nova, aprovada intacta | ✅ |
| Decisão 0c — documento não-clínico (`CONSENT_FORM`) nunca dispara nada | ✅ |
| Reconciliação/job rodando de fato em produção (reprocessa `needsReprocessing`) | ✅ |
| Auto-heal de triagem sem relatório (job cria `GENERATING` sozinho, ~1 min) | ✅ (observado indiretamente) |
| Edge case: documento chega antes da triagem ser submetida | ✅ (self-heal/erro gracioso, não é bug) |
| T-4.1 — editar observação do fisioterapeuta, persiste após reload completo | ✅ |
| T-4.2 — separação visual da observação | ✅ |
| T-4.3/4 — link SOAP→Evidence (botão aparece, abre o relatório certo) | ✅ (após contornar o bug abaixo) |
| **BUG** — criar nota SOAP com campos O/A/P vazios → 500, nota não criada | ❌ |
| Sanity check pacientes reais (Mione, Ana Livia, Gabby, Eduardo, Daniel To) | ✅ zero alteração |
| Isolamento cross-tenant (clínica B nunca tocada pela atividade da clínica A) | ✅ |
| Limpeza de todos os dados de teste em produção | ✅ |
| Rajada de uploads (0b) | ⚠️ não executado online (já coberto exaustivamente localmente) |
| Extração real via Docling (achado de exame) | ⚠️ não confirmada (mesma ressalva do QA local) |

## Detalhes

### Decisão 0 — os 3 casos, via UI real
Clínica de teste `qa-066-online-a` criada, paciente A com triagem `isSubmitted: true`.

- **0.1 (sem relatório):** para isolar esse caso da reconciliação automática (que corre a cada ~1-2
  min em produção e teria criado um relatório de qualquer forma), criei um paciente D com triagem
  **não submetida** (`isSubmitted: false`) — a reconciliação nunca toca esse paciente. Upload de um
  documento `IMAGING` para o paciente D criou um `ClinicalEvidenceReport` novo imediatamente
  (`status: GENERATING`, `createdAt` == `updatedAt` do documento, a poucos ms de diferença).
- **0.2 (relatório não aprovado):** o paciente A já tinha um relatório `DRAFT` (criado pela própria
  reconciliação automática antes que eu conseguisse testar o caso 0.1 nele — ver observação
  abaixo). Upload de um documento `IMAGING` marcou a MESMA linha (`needsReprocessing: true`, mesmo
  `id`, status continuou `DRAFT` — não pulou direto pra `GENERATING`, exatamente como o comentário
  no schema descreve).
- **0.3 (relatório `APPROVED`):** aprovei o relatório do paciente A via UI (botão "Approve" na aba
  Evidence). Upload de um documento `MEDICAL_REPORT` em seguida criou uma **linha nova**
  (`status: GENERATING`, depois processada para `DRAFT` com narrativa real). A linha aprovada
  permaneceu **byte-a-byte intacta**: mesmo `id`, `approvedAt`, `reviewedById`, `clinicianNotes`,
  `narrativeEn` (hash) inalterados.
- **0c (documento não-clínico):** upload de `CONSENT_FORM` no paciente B (que já tinha relatório
  `DRAFT` da reconciliação) não alterou `needsReprocessing` nem `updatedAt` do relatório — o
  documento foi salvo, o relatório nunca foi tocado.

**Observação de processo, não um bug:** a reconciliação automática (T-2) roda tão rápido em
produção (~1 min, não os ~2 min documentados) que criou relatórios `GENERATING`→`DRAFT` reais pros
3 pacientes de teste (A, B, C) menos de 1 minuto depois das fixtures serem inseridas no banco —
antes que eu conseguisse testar 0.1 "limpo" no paciente A. Precisei criar um 4º paciente com
triagem não-submetida especificamente para isolar esse cenário da reconciliação. Isso não é um
problema: é a própria confirmação, sem eu precisar simular nada, de que **a reconciliação está
rodando de verdade em produção com o código novo** (um dos itens mais importantes pedidos neste QA
online) — o job pegou as 3 triagens `isSubmitted: true` sem relatório e gerou um relatório real via
IA para cada uma, sozinho.

### Reconciliação — confirmação direta do job em produção
Depois do upload que marcou `needsReprocessing: true` no paciente A (11:10:33), sem eu forçar nada,
o próprio job de produção reprocessou a linha: `needsReprocessing` voltou a `false` e `updatedAt`
mudou para 11:11:39 (~1 min depois) — uma geração de IA real rodou sozinha, no ciclo normal do job.
Confirma que o `generatePendingEvidenceReports` deployado está de fato ativo e pegando o schema/
lógica novos (T-1+T-2), não é suposição.

### Edge case descoberto: documento chega antes da triagem existir
No paciente D (triagem `isSubmitted: false` de propósito, pra isolar 0.1), o relatório criado pelo
upload ficou sem `screeningId` (não existe triagem submetida ainda). Quando o job tentou processá-lo,
`generateEvidenceReport` tentou o self-heal (`relinkBrokenEvidenceReport`/busca por triagem
submetida), não encontrou nenhuma, e terminou graciosamente: `status: DRAFT`,
`error: "No screening linked to this report."` — **não travou em `GENERATING`, não caiu em loop de
retry indefinido** (comportamento já existente e documentado no código, `lib/evidence-report.ts`
linhas 262-287). Não é um bug desta atividade; é um efeito colateral esperado do meu setup de teste
(paciente sem triagem submetida) e confirma que a resiliência já prevista no código funciona também
em produção.

### T-4.1/4.2 — Observação do fisioterapeuta ✅
Editei e salvei uma observação real na aba Evidence do paciente A (ainda em `DRAFT`), recarreguei a
página inteira (não só a aba) e a observação persistiu, sem alterar o conteúdo gerado pela IA
(narrativa/sugestões/gaps inalterados). Seção com borda e ícone próprios, claramente separada do
resto do relatório. Screenshots:
`screenshots/online-t4-notes-section.png`,
`screenshots/online-t4-notes-persisted-full-page.png`.

### 🐛 BUG real — criação de nota SOAP falha com campos vazios (500, leak de erro Prisma)
Ao criar uma nota SOAP pelo formulário "New SOAP Note" (aba Clinical Notes) preenchendo **só** o
campo Subjective (deixando Objective/Assessment/Plan vazios — o formulário não bloqueia isso no
cliente), o `PATCH /api/admin/patients/[id]` com `action: "add_clinical_note"` retornou **500**, com
o erro cru do Prisma exposto na UI (`screenshots/online-t4-BUG-soap-create-500.png`):

```
Invalid `prisma.sOAPNote.create()` invocation: { data: { ..., objective: null, assessment: null,
plan: null, ... } } Argument `patient` is missing.
```

**Causa raiz confirmada:** `SOAPNote.subjective/objective/assessment/plan` são campos obrigatórios
(`String @db.Text`, não-nulos) no schema (`prisma/schema.prisma` linhas 1179-1182), mas
`app/api/admin/patients/[id]/route.ts` linhas 154-157 grava `objective: objective || null` (e o
mesmo para `assessment`/`plan`) — ou seja, quando o campo vem vazio da UI, o código tenta gravar
`null` num campo `NOT NULL`. O Prisma rejeita a operação inteira; a mensagem de erro que ele produz
("Argument `patient` is missing") é enganosa/não aponta pro campo real culpado, mas a causa é
essa — confirmado inspecionando o DMMF do schema local (mesmos campos, mesma obrigatoriedade) e
reproduzindo com sucesso ao preencher os 4 campos.

- **Não é um bug introduzido pela atividade 066** — o código de `add_clinical_note` já existia antes
  e sempre teve esse `|| null` nos 4 campos obrigatórios. Só ficou mais visível agora porque esse
  mesmo bloco de código foi tocado pela T-4 (adição do `evidenceReportId`), e é exatamente o
  caminho que eu precisava exercitar pra testar o link SOAP→Evidence.
- **Impacto real:** qualquer terapeuta que salvar uma nota SOAP rápida preenchendo só 1-2 dos 4
  campos (cenário plausível no uso real — "S" preenchido, volta depois pra completar o resto) recebe
  um erro 500 com stack trace do Prisma na tela, a nota **não é criada**, sem nenhuma pista clara do
  que fazer. Existe uma segunda rota (`app/api/soap-notes/route.ts`) com a mesma criação — essa
  outra pelo menos tem uma validação de 400 antes (`if (!patientId || !subjective || !objective ||
  !assessment || !plan)`), mas usa `/api/admin/patients/[id]` (a que eu bati) que **não tem
  essa validação** antes de chamar o Prisma.
- **Recomendação:** adicionar a mesma validação 400 (`"all SOAP note fields are required"`) em
  `add_clinical_note` antes do `prisma.sOAPNote.create`, e/ou tornar o formulário da UI obrigatório
  nos 4 campos antes de habilitar "Save Note". Não corrigido — fora do escopo deste QA.

Depois de refazer o teste preenchendo os 4 campos, a criação funcionou normalmente e o resto do
cenário T-4 pôde ser validado:

### T-4.3/4 — Link SOAP → Evidence ✅ (após contornar o bug acima)
Nota SOAP criada com sucesso (4 campos preenchidos) no paciente A, que já tinha 2 versões de
relatório (aprovada + nova em `DRAFT`). O botão "Evidence" apareceu na nota
(`screenshots/online-t4-soap-form.png`), e ao clicar trocou para a aba Evidence sem reload de página
(`screenshots/online-t4-soap-evidence-click-report.png`). Confirmado no banco:
`SOAPNote.evidenceReportId` = id da versão **mais recente** do relatório (a `DRAFT` nova, não a
`APPROVED` antiga) — exatamente o comportamento documentado ("o relatório mais recente no momento da
criação da nota, não um ponteiro vivo pro que for mais recente depois").

### Sanity check — pacientes reais ✅
Snapshot completo (`status`, `needsReprocessing`, `redFlag`, `clinicianNotes`, `approvedAt`,
`reviewedById`, hash SHA-256 de `narrativeEn`/`narrativePt`, `suggestions`, `gaps`) de todos os
`ClinicalEvidenceReport` de Mione De Almeida, Ana Livia Pessin Prata, Gabby Boss, Eduardo Nogueira e
Daniel To, capturado **antes** de qualquer ação deste QA e **depois** de tudo (incluindo as 3
gerações reais de IA disparadas pelos testes, que rodam no mesmo job global). `diff` entre os dois
snapshots: **zero diferenças**. Nenhum paciente real foi afetado.

### Isolamento cross-tenant ✅
Clínica B (`qa-066-online-b`, paciente C) nunca teve seu relatório tocado por nenhuma ação feita na
clínica A durante todo o QA (mesmo timestamp de `updatedAt` da criação inicial pela reconciliação,
sem documentos, sem `needsReprocessing`). Acesso do SUPERADMIN aos pacientes de teste só funcionou
depois de trocar o "Active Clinic" pra clínica certa — tentar acessar com "Global View" (ou a
clínica errada) devolveu 404 "Patient not found" (mesmo texto genérico usado pra registro
inexistente, não vaza a existência do paciente — comportamento correto).

### Não executado / ressalvas
- **Rajada de uploads (0b):** já validada exaustivamente no QA local (T-1) com o mesmo código de
  produção; não repeti online para não gastar chamadas de IA extras sem necessidade.
- **Extração real via Docling:** os 3 documentos PDF sintéticos enviados (658/655 bytes,
  minimalistas) ficaram com `extractedText`/`aiSummary` nulos mesmo depois das gerações reais de IA
  rodarem — mesma ressalva já registrada no QA local (T-1, cenário 1: `DOCLING_API_URL` inacessível
  do ambiente de teste, ou o PDF sintético não é "real" o suficiente pro parser). Não é possível
  confirmar com certeza qual dos dois motivos é a causa a partir daqui — recomendo testar
  separadamente com um PDF real de exame (sintético, sem dado sensível, mas gerado por uma
  ferramenta real) se quiser fechar essa pendência.

## Limpeza
- `scripts/qa/t066-online-cleanup.cjs` executado contra o banco de produção: 2 clínicas
  (`qa-066-online-a`, `qa-066-online-b`), 5 usuários (1 admin + pacientes A/B/C/D), 4 documentos, os
  relatórios e a nota SOAP associados — todos removidos.
- Confirmado por query direta: zero clínicas/usuários com esses slugs/e-mails restantes no banco de
  produção.
- Arquivos temporários de upload removidos do disco local.
- Aba do browser fechada ao final.
- **Nenhum paciente real foi escrito/alterado** — confirmado pelo diff de baseline acima.

## Scripts criados (mantidos no repo, mesmo padrão dos demais `scripts/qa/*.cjs`)
- `scripts/qa/t066-online-fixtures.cjs` — cria clínicas/pacientes de teste em produção.
- `scripts/qa/t066-online-add-patient-d.cjs` — paciente extra com triagem não submetida.
- `scripts/qa/t066-online-baseline.cjs` — snapshot read-only dos pacientes reais.
- `scripts/qa/t066-online-inspect.cjs` — leitura dos relatórios/documentos/notas de teste.
- `scripts/qa/t066-online-cleanup.cjs` — limpeza completa.
- Todos com trava de segurança: recusam rodar se `DATABASE_URL` não apontar pro host de produção
  conhecido (`86.48.18.88:5490`).

## Conclusão
O código deployado em produção (commit `8637dafd`) se comporta exatamente como testado e aprovado
localmente para a lógica core da atividade 066: os 3 casos da Decisão 0, a reconciliação automática
rodando de fato no job de produção, a observação do fisioterapeuta persistindo sem tocar o conteúdo
da IA, e o link SOAP→Evidence apontando pro relatório certo. Nenhum paciente real foi afetado.

O único achado real é o bug de validação em `add_clinical_note` (500 + leak de erro Prisma quando
campos O/A/P ficam vazios) — pré-existente, não causado por esta atividade, mas relevante porque
compartilha o código tocado pela T-4 e pode gerar frustração real no uso diário (terapeuta perde a
nota inteira e vê um stack trace). Recomendo tratar como um bug a corrigir (validação 400 antes do
`prisma.sOAPNote.create`, ou campos obrigatórios no formulário), fora do escopo desta atividade mas
vale abrir como item separado.
