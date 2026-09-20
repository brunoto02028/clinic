# QA Report — T-4: Campo de observação do fisioterapeuta + link com SOAPNote

**Data:** 2026-09-20
**Resultado geral:** ✅ aprovado

## Ambiente
- Banco: `bpr_clinic_local`. `AI_STRICT_MODE=true`.
- Dev server local subido em `next dev -p 4100` para esta sessão de QA (portas padrão ocupadas por
  outro projeto não relacionado).
- Fixtures via `scripts/qa/t066-t4-fixtures.cjs` (clínica A `qa-t066-t4`: pacientes `normal` — sem
  red flag, `redflag` — `redFlag: true`, `noreport` — sem relatório; clínica B `qa-t066-t4-other`:
  paciente `other` pro teste cross-tenant). Limpas ao final via `scripts/qa/t066-t4-cleanup.cjs`
  (2 clínicas, 5 usuários removidos).
- UI testada via Playwright (staff ADMIN da clínica A). API testada via `curl` com cookie de sessão
  mintado.

## Resumo
| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Editar observação via UI, salvar, recarregar página, persiste sem tocar conteúdo da IA | UI | ✅ |
| 2 | Separação visual da seção de observações (screenshot) | UI | ✅ |
| 3 | Seção de observações aparece e é editável mesmo com `redFlag: true` | UI | ✅ |
| 4 | Nota SOAP nova em paciente com relatório → botão "Evidence" aparece e troca de aba sem reload | UI | ✅ |
| 5 | Nota SOAP nova em paciente sem relatório → sem botão "Evidence", sem erro | UI | ✅ |
| 6 | Isolamento cross-tenant: PATCH `clinicianNotes` com `reportId` de outra clínica → 404 | API | ✅ |
| 7a | `PATCH` sem `status` nem `clinicianNotes` → 400 "Nothing to update" | API | ✅ |
| 7b | `PATCH` com `clinicianNotes` não-string → 400 "Invalid clinicianNotes" | API | ✅ |
| 7c | `PATCH` só com `clinicianNotes` → sucesso, `status` inalterado | API | ✅ |
| 8a | Regressão: "Mark under review" e "Approve" | UI | ✅ |
| 8b | Regressão: toggle EN/PT (não sobrescreve a observação) | UI | ✅ |
| 8c | Regressão: botão "Regenerate" | UI | ⚠️ não executado (evita custo real de IA/invalidar fixture) |
| 9 | Nenhuma mudança introduz caminho de envio automático ao paciente | Código | ✅ |
| 10 | `npx tsc --noEmit -p .` sem erros novos nos 5 arquivos tocados | Build | ✅ |

## Detalhes

### 1. Editar observação via UI, persistência ✅
Editei e salvei uma observação real via Playwright, recarreguei a página inteira, reabri a aba
Evidence — o texto persistiu. Confirmado por query direta no banco (após toda a sequência do teste,
incluindo mark-under-review → approve → toggle PT/EN) que `narrativeEn`/`narrativePt`/
`suggestions`/`gaps` permaneceram byte-a-byte idênticos aos da fixture original, enquanto
`clinicianNotes` refletia o texto editado. Screenshot: `screenshots/t-4-notas-persistidas.png`.

### 2. Separação visual ✅
Seção com borda/fundo azul-céu, ícone de lápis, cabeçalho próprio — claramente distinta do resto do
relatório (amber pro disclaimer, vermelho pro red flag).

### 3. Observações com `redFlag: true` ✅
Banner de alerta aparece, resto do conteúdo da IA fica oculto (como esperado), mas a seção de
observações continua visível e editável — editei e salvei com sucesso. Screenshot:
`screenshots/t-4-redflag-notas.png`.

### 4. Link SOAP → Evidence ✅
Nota SOAP criada num paciente com relatório existente ganhou o botão "Evidence"; clicar trocou a
aba ativa sem navegação de página/reload. Confirmado no banco: `SOAPNote.evidenceReportId` = id do
relatório. Screenshot: `screenshots/t-4-soap-evidence-button.png`.

### 5. Nota SOAP sem relatório ✅
Criação normal, sem erro, sem botão "Evidence". Confirmado `evidenceReportId: null` no banco.
Screenshot: `screenshots/t-4-soap-sem-relatorio.png`.

### 6. Isolamento cross-tenant ✅
`PATCH` de `clinicianNotes` com `reportId` de outra clínica → `404 {"error":"Patient not found"}`.
GET do mesmo relatório também 404. Nada foi alterado no relatório da clínica B.

### 7a-c. Validação da API ✅
Sem `status` nem `clinicianNotes` → 400. `clinicianNotes` não-string → 400. Só `clinicianNotes` →
200, `status` permanece o que já era.

### 8a/8b. Regressão — status e toggle EN/PT ✅
"Mark under review"/"Approve" funcionando (confirmado no banco). Toggle PT/EN funciona, observação
do fisioterapeuta nunca é traduzida/reescrita automaticamente (só o conteúdo da IA é, comportamento
já esperado da atividade 065). Nenhum erro de console.

### 8c. Regressão — "Regenerate" ⚠️ não executado
Botão presente e clicável, deliberadamente não clicado (regeneraria com IA real e sobrescreveria a
fixture usada pra provar não-interferência no cenário 1). Nenhuma mudança desta tarefa toca o fluxo
de regeneração — risco baixo, mas reportado como não executado em vez de presumido.

### 9. Sem caminho de envio automático ✅
`grep` nos 5 arquivos tocados não encontrou nenhum caminho pra `SENT_TO_PATIENT`/envio automático. O
`allowed` do PATCH continua sem `SENT_TO_PATIENT`.

### 10. `tsc --noEmit` ✅
Zero erros novos nos 5 arquivos tocados por esta tarefa.

## Erros de console
Nenhum em nenhum passo.

## Falhas e recomendações
Nenhuma falha. Único ponto em aberto: "Regenerate" não testado de ponta a ponta (ver 8c) — baixo
risco, recomendado rodar isoladamente se quiser cobertura completa, aceitando o custo de IA real.
