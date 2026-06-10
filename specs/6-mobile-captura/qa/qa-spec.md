# QA Spec — Atividade 6 (Fase A): Foot scan por fotos

iPhone via Expo Go (câmera real; você captura). API via curl (auth dual).
Análise (Gemini) depende de GEMINI_API_KEY no ambiente.

## T-1
- 1.1 App pede permissão de câmera (Expo Go)
- 1.2 API: criar scan / upload / analyze respondem a bearer (200); cookie web sem regressão; sem token negado

## T-2
- 2.1 Captura guiada percorre os ângulos com instrução
- 2.2 Preview + refazer funcionam
- 2.3 Upload de todas as fotos (capturas persistidas no backend)

## T-3
- 3.1 Análise disparada após captura
- 3.2 Status acompanhado → measurements → viewer 3D abre
- 3.3 Sem GEMINI_API_KEY → mensagem clara (não trava)
