# QA Report — T-6: Transcript diarizado + geração de SOAP

**Data:** 2026-09-19
**Resultado geral:** ✅ aprovado

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | Sessão `TRANSCRIBED`: transcript formatado + player de áudio autenticado | UI | ✅ |
| 2 | Renomear Speaker A/B → exibição atualiza sem duplicar/perder texto | UI | ✅ |
| 3 | Associar paciente sem prévio, persiste após reload | UI | ✅ |
| 4 | "Generate SOAP" usa rótulos escolhidos (não "Speaker A/B" cru) | UI + rede | ✅ |
| 5 | `MERGING`/`TRANSCRIBING` → estado "processando", polling automático sem reload | UI | ✅ |
| 6 | `FAILED` sem/com `mergedAudioR2Key` → erro legível, "Try again" condicional | UI + API | ✅ |
| 7 | Rota de áudio: cross-tenant 404, `Range` → 206 + `Content-Range` | API | ✅ |
| 8 | Botão "View transcript & generate SOAP" após Stop de gravação real | UI (fluxo real) | ✅ |
| 9 | T-5 regressão: `error` concatena mensagens (não sobrescreve) | API/job | ✅ |

Endpoints adicionais confirmados sem ressalva: `GET`/`PATCH sessions/[id]` (404 cross-tenant,
validação de `patientId`), `POST retry` (400 se não `FAILED`, 400 se sem `mergedAudioR2Key`, 200
no caso válido).

`npx tsc --noEmit -p .` (filtrado `reconstruir/`): 1898 erros, baseline, nenhum novo.

## Setup
Login como staff (THERAPIST/ADMIN) de duas clínicas QA distintas para o teste cross-tenant.
Fixtures de `AmbientRecordingSession` criadas direto no banco cobrindo `TRANSCRIBED`, `MERGING`,
`FAILED` (com e sem áudio), e um caso de regressão T-5. Áudio de teste real (tom de 3s) subido ao
R2. Uma gravação real completa também foi feita pela UI (Start → ~16s → Stop) validando o fluxo
ponta a ponta.

**Nota de custo**: com `AI_STRICT_MODE=true` (config local), toda tentativa de transcrição real
foi bloqueada antes de qualquer chamada à AssemblyAI — confirmado via fixture e via gravação real
pela UI. Nenhum centavo gasto nesta rodada de QA.

## Detalhes

### 1. Sessão TRANSCRIBED — transcript + player ✅
Transcript exibido formatado, `<audio>` aponta pra rota autenticada (nunca URL pública do R2).
Áudio confirmado carregado de fato via `page.evaluate` (`readyState: 4`, `duration` batendo com o
arquivo real).

### 2. Renomear speakers ✅
Atualização instantânea da exibição, sem duplicar/perder texto. Confirmado que é só exibição —
reload volta a mostrar "Speaker A/B" cru (Suposição 6 do plan.md respeitada).

### 3. Associar paciente ✅
Busca funcionou, associação persistiu após reload.

### 4. Generate SOAP usa rótulos corretos ✅
Body real da requisição inspecionado via Playwright — confirmado `"transcript":"Terapeuta:
...\nPaciente: ..."`, nunca "Speaker A/B" cru. SOAP gerado atribuiu corretamente as falas.

### 5. Polling automático ✅
Mudança de status no banco refletida na tela em até 8s, sem reload, sem erro de console.

### 6. FAILED — erro + retry condicional ✅
Botão "Try again" só aparece com `mergedAudioR2Key` presente. Retry funciona (`status` volta pra
`TRANSCRIBING`, `attempts`/`error` zerados) tanto via API quanto via UI.

### 7. Rota de áudio — cross-tenant e Range ✅
Sem auth → redirect padrão do middleware (não é regressão). Staff da própria clínica → 200 com
`Accept-Ranges: bytes`. Com `Range: bytes=0-99` → 206, `Content-Range` correto. Staff de outra
clínica → 404.

### 8. Botão "View transcript & generate SOAP" ✅
Aparece após Stop de uma gravação real, leva pra tela correta. Pipeline completo confirmado em
fluxo real (RECORDING→ENDED→MERGING→TRANSCRIBING→FAILED pelo strict-mode gate), sem chamada à
AssemblyAI.

### 9. T-5 (regressão) — error concatena ✅
Sessão com gap note pré-existente + nova falha do strict-mode gate → `error` final contém as duas
mensagens, separadas por quebra de linha, nenhuma perdida.

## Erros de console
Nenhum atribuível ao T-6. Um `ReferenceError: setAmbientRecordingActive is not defined` apareceu
uma vez numa aba já aberta de uma run anterior (não reproduziu em nenhum load fresco durante esta
run) — registrado, não investigado por estar fora do escopo.

## Limpeza realizada
R2 e banco local limpos (fixtures + gravação real). 8 scripts temporários removidos. Nenhuma
gravação ficou ativa.

## Falhas e recomendações
Nenhuma falha nos critérios de aceite. Observação não-bloqueante: "Try again" numa sessão que
falhou por `AI_STRICT_MODE` sempre volta a falhar pelo mesmo motivo — correto, mas pode confundir;
vale considerar uma dica visual específica pra esse caso numa iteração futura (fora do escopo
desta tarefa).
