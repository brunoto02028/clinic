# QA spec — 068 E-mail ao paciente com prévia

| # | Tipo | Tarefa | Passos | Esperado |
|---|---|---|---|---|
| 1 | API | T-1 | preview com assunto/corpo válidos | 200, HTML com logo, `toMasked`, hash |
| 2 | API | T-1 | send com o mesmo conteúdo do preview | 200, e-mail entregue (fixture), log criado |
| 3 | API | T-1 | send com corpo alterado após o preview | 409, nada enviado |
| 4 | API | T-1 | assunto vazio / corpo > 5000 / idioma inválido | 400 |
| 5 | API | T-1 | paciente sem e-mail | 400 |
| 6 | API | T-1 | sem sessão / sessão de paciente / staff de outra clínica | redirect-401 / 403 / 404 |
| 7 | API | T-1 | 6 envios em sequência ao mesmo paciente | rate limit |
| 8 | UI | T-2 | abrir composer, avançar sem escrever | bloqueado |
| 9 | UI | T-2 | escrever → prévia mostra HTML exato → enviar | confirmação + item no histórico |
| 10 | UI | T-2 | editar após a prévia | exige nova prévia |
| 11 | UI | T-2 | EN/PT; personal não vê o botão | ok |
| 12 | UI | T-3 | modelo de visita domiciliar com consulta às 16:30 BST | texto mostra 16:30 (não 15:30) e endereço |
| 13 | UI | T-3 | atalho "Enviar confirmação" na consulta | abre composer preenchido; nada enviado sozinho |
| 14 | API | T-3 | POST /api/admin/appointments com `sendConfirmation:false` (pagamento presencial) | 201; nenhum e-mail ao paciente (log do guard não mostra envio ao paciente) |
| 15 | API | T-3 | POST /api/admin/appointments sem `sendConfirmation` | comportamento antigo: e-mail de confirmação ao paciente (descartado pelo guard local) |
| 16 | API | T-3 | POST com `paymentMode:"online"` e `sendConfirmation:false` | e-mail ainda enviado (leva o link de pagamento) |
| 17 | UI | T-3 | Diálogo New Appointment: checkbox de confirmação | desmarcado por padrão; marcado e desabilitado em pagamento online; toast diz "Nenhum email foi enviado…" quando desmarcado |
| 18 | UI | T-2 | Painel na aba Messages: histórico "Emails sent" com detalhe (iframe do HTML enviado) | lista assunto/data/autor/status; expandir mostra o e-mail |
| 19 | API | T-1 | GET/POST /email/template com consulta de OUTRO paciente | 404 |
| 20 | UI | T-2 | Login personal (estúdio) | painel de e-mail não aparece; API 403 |
