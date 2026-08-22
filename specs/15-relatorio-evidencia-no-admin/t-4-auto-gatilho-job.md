# T-4: Auto-gatilho na triagem + job

**Status:** pendente
**Depende de:** T-1, T-3

## Objetivo
Ao submeter a triagem, criar o relatório como `GENERATING` sem travar a resposta; um job
processa os pendentes até `DRAFT`.

## Contexto
- Gancho: `app/api/medical-screening/route.ts` POST, após o `create` (não no autosave).
- Automação: `lib/background-jobs.ts` (setInterval) + `instrumentation.ts`.

## Passos
1. Na rota da triagem (submit real, não `_autosave`): após criar/《submeter》a triagem, criar um
   `ClinicalEvidenceReport { status: GENERATING }` (fire-and-forget, try/catch como os
   `notifyPatient`). Não aguardar a IA. Evitar duplicar se já existe report GENERATING/DRAFT
   para aquela triagem.
2. Em `background-jobs.ts`: novo job (`setInterval`, ex.: a cada 2–5 min) que pega reports
   `GENERATING` e chama `generateEvidenceReport` (T-3), com concorrência limitada (1 por vez) e
   proteção contra reprocessar em loop (marca tentativa/《error》).
3. Registrar o job no `startBackgroundJobs()` + um warmup `setTimeout`.

## Arquivos afetados
- `app/api/medical-screening/route.ts`
- `lib/background-jobs.ts`

## Critérios de aceite
- [ ] Submeter triagem cria um report `GENERATING` e **não** atrasa a resposta ao paciente.
- [ ] O job transforma `GENERATING → DRAFT` chamando o pipeline.
- [ ] Não cria report duplicado para a mesma triagem; autosave não dispara nada.
- [ ] Falha no job não derruba os outros jobs.
