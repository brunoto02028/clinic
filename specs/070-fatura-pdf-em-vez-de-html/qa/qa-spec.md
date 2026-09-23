# QA spec — 070 Fatura em PDF

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 1 | API | Gerar fatura avulsa (`POST /api/admin/patients/[id]/invoice`) com 1-2 itens | 201, item vai pra `PENDING_APPROVAL`, `attachmentsJson` tem 1 anexo `.pdf` (não `.html`) |
| 2 | API | Decodificar o `contentBase64` do anexo | Começa com `%PDF-`, é um PDF válido (abre num visualizador) |
| 3 | UI | Aba Marketing → Email → Pending Approval, abrir o item | Prévia mostra o PDF renderizado num iframe (não texto/código cru) |
| 4 | UI | Aprovar (`approveSend`) | Status muda pra `SENT`; e-mail "enviado" (sink local, sem envio real) com o PDF anexo |
| 5 | API | Fatura com muitos itens (≥25, descrição longa) | PDF gerado com múltiplas páginas; Total e forma de pagamento presentes (não perdidos) |
| 6 | API | Nome/descrição com caracteres especiais (acentos comuns) | Aparecem corretos no PDF |
| 7 | UI | Fatura de agendamento (`app/api/admin/appointments/[id]/invoice`), rota GET de prévia | Continua servindo HTML inline no navegador (não deve ter mudado) |
| 8 | Regressão | Tenant isolation (fatura de paciente de outra clínica) | 404, como já era antes |
