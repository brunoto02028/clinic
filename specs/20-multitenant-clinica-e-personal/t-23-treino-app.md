# T-23: Módulo Treino no app do aluno

**Status:** pendente
**Trilha:** PERSONAL
**Depende de:** T-22

## Objetivo
A mesma experiência da T-22 no app (`mobile/`).

## Passos
1. `/api/mobile/modules` devolve o módulo `treino` só para aluno de tenant personal.
2. Grupo de telas `(treino)`: lista, treino do dia com vídeo, registrar séries, histórico.
3. QA no alvo web do Expo (`expo start --web`) via Playwright.

## Critérios de aceite
- [ ] Cenários da T-23 passando.
- [ ] Regressão: o paciente da BPR não vê o módulo.
