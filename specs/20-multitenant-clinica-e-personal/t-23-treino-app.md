# T-23: Módulo Treino no app do aluno

**Status:** backend concluído; telas do app entregues (código + tsc), QA/EAS pendentes
**Trilha:** PERSONAL
**Depende de:** T-22

> Backend (endpoints mobile + módulo `treino`): QA aprovado (qa/report-t-23-backend.md, 36/36) + review feito — **deployável pelo push**.
> Telas do app (`mobile/app/(app)/(treino)`): código pronto + type-check ok (qa/report-t-23-app.md). QA de runtime (expo web/device) e deploy (build EAS) ficam com o Bruno — não executáveis nesta sessão.

## Objetivo
A mesma experiência da T-22 no app (`mobile/`).

## Passos
1. `/api/mobile/modules` devolve o módulo `treino` só para aluno de tenant personal.
2. Grupo de telas `(treino)`: lista, treino do dia com vídeo, registrar séries, histórico.
3. QA no alvo web do Expo (`expo start --web`) via Playwright.

## Critérios de aceite
- [x] Backend: cenários da T-23 passando (M1–M5, 36/36).
- [ ] App: cenários de UI via expo-web/device (pendente — ambiente do Bruno).
- [~] Regressão: paciente da BPR não vê o módulo — confirmado no backend (M2/M5); UI pendente.
