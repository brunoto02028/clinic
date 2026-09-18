# QA Report — T-1: Pressão arterial
**Data:** 07/06/2026 · **Resultado:** ✅ APROVADO · Playwright/Expo Web + curl.

| # | Cenário | Obtido | OK |
|---|---------|--------|----|
| 1.1 | Aba Saúde lista 4 sub-telas | Pressão/Tarefas/Documentos/Educação | ✅ |
| 1.2 | Histórico de leituras | 122/78, 118/76 (datas pt-BR) | ✅ |
| 1.3 | Registrar leitura persiste | 130/85 registrado via UI → aparece no histórico | ✅ |
| 1.5 | GET bearer / POST | 200 (GET e POST) | ✅ |

Evidência: `screenshots/t1-blood-pressure.png`. `/api/patient/blood-pressure` (dual). 0 erros console.
