# QA spec — 067 Medidas do membro

| # | Tipo | Tarefa | Passos | Esperado |
|---|---|---|---|---|
| 1 | API | T-1 | POST medida válida (lado LEFT, coxas, flexão 120, extensão -3) | 201; `protocolWeek` correto; `operatedSide` gravado |
| 2 | API | T-1 | POST sem nenhum valor numérico | 400 |
| 3 | API | T-1 | POST com flexão 250 / circunferência 500 / data futura / lado inválido | 400 cada |
| 4 | API | T-1 | GET/POST sem sessão | 401 |
| 5 | API | T-1 | Staff de outra clínica lê/cria/edita/exclui no paciente | 404 |
| 6 | API | T-1 | PATCH corrige valor; muda data → semana recalculada | 200 |
| 7 | API | T-1 | DELETE de registro de outro paciente | 404 |
| 8 | UI | T-2 | Abrir aba Measurements do paciente | Formulário + histórico vazio |
| 9 | UI | T-2 | Lançar medida completa | Linha no histórico com Δ operada−outra, semana, ADM |
| 10 | UI | T-2 | Lançar 2ª medida | Gráficos com 2 pontos; Δ evolui |
| 11 | UI | T-2 | Editar e excluir registro | Reflete na lista |
| 12 | UI | T-2 | Formulário vazio / valor inválido | Mensagem de erro, nada gravado |
| 13 | UI | T-2 | Login personal | Aba não aparece |
| 14 | UI | T-3 | Aba Protocol com medida existente | Atalho mostra última medida e abre a aba |
| 15 | UI | T-2 | Alternar EN/PT | Rótulos nos dois idiomas |
