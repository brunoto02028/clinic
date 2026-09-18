# QA Spec — Atividade 3: Saúde & Dados (Fase 2)

API via curl (auth dual), UI via Playwright/Expo Web. Auth presente → incluir sem/invalid token.

## T-1 Pressão arterial
- 1.1 UI: aba Saúde lista 4 sub-telas
- 1.2 UI: histórico exibe leituras reais (ou vazio)
- 1.3 UI: registrar leitura → persiste após reload
- 1.4 API: POST sem campos → 400; valores fora de faixa → 400
- 1.5 API: GET bearer → 200; sem token → 401

## T-2 Tarefas
- 2.1 UI: lista de tarefas reais (ou vazio)
- 2.2 UI: marcar concluída → persiste
- 2.3 API: PATCH status inválido → 400

## T-3 Documentos
- 3.1 UI: lista de documentos reais (ou vazio)
- 3.2 UI: abrir documento
- 3.3 API: GET bearer → 200

## T-4 Educação
- 4.1 API: GET /api/education bearer → 200; cookie → 200 (regressão); sem token → 401
- 4.2 UI: lista de conteúdos
- 4.3 UI: detalhe do conteúdo
