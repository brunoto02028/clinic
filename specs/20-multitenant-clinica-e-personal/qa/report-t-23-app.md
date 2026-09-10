# QA T-23 (app) — Telas de treino no app do aluno

**Atividade:** specs/20-multitenant-clinica-e-personal
**Tarefa:** T-23 — sub-parte telas do app (`mobile/`)
**Data:** 2026-09-10
**Resultado:** ⏳ **CÓDIGO PRONTO + type-check OK; QA de runtime e deploy PENDENTES** (fora do alcance desta sessão)

## Entregue (código)
- `mobile/app/(app)/(treino)/_layout.tsx` — Stack do grupo.
- `mobile/app/(app)/(treino)/index.tsx` — lista dos treinos do aluno (nome, nº de exercícios, dias).
- `mobile/app/(app)/(treino)/[id].tsx` — execução: resumo prescrito por exercício, link do vídeo (`Linking.openURL`), registro de reps/carga/RPE por série pré-preenchido, checkbox por série, RPE da sessão, "Finish session" (anti-duplo-submit), histórico.
- `mobile/src/api/training.ts` — client (`fetchWorkouts`, `fetchWorkoutHistory`, `logSession`) sobre `/api/mobile/workouts`.
- `mobile/src/api/modules.ts` — chave `treino` no union `AppModule`.
- `mobile/app/(app)/module-select.tsx` — ícone (`barbell-outline`) + rota (`/(app)/(treino)`) do módulo.

Espelha os grupos existentes (`(clinica)`/`(lab)`) e a paleta da marca do app (tokens ink/bone/greige).

## Verificação feita
- **Type-check:** `npm install` no `mobile/` + `npx tsc --noEmit` → **0 erros** nos arquivos da T-23 (único erro do projeto é um aviso de deprecação pré-existente do `tsconfig` `baseUrl`).
- **Backend consumido:** `/api/mobile/workouts` + `/logs` + módulo `treino` — verificados em runtime (report-t-23-backend.md, 36/36).

## Pendências (precisam do seu ambiente)
1. **QA de runtime:** a spec pede QA via `expo start --web` + Playwright. Requer o toolchain Expo/device — não executado aqui. Cenários a rodar: aluno personal vê o módulo Training no module-select, abre a lista, executa um treino, registra a sessão (POST 201), vê o histórico; paciente da clínica **não** vê o módulo.
2. **Deploy:** o app **não** sobe pelo `git push` (deploy web/Coolify) — precisa de **build EAS**. As telas só chegam ao usuário via EAS build.

## Critérios de aceite
- [x] Cenários da T-23 backend passando (report-t-23-backend.md).
- [ ] Cenários de UI do app (pendente: expo web/device).
- [ ] Regressão no app: paciente da BPR não vê o módulo (pendente de runtime; gating confirmado no backend por M2/M5).
