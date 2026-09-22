# QA online (produção) — atividade 068 — commit 933efd74

**Veredito: APROVADO**, sem bugs. Executado em https://bpr.clinic após o deploy do commit que incluiu o arquivo `patient-email-panel.tsx` que faltava no push anterior. Fixture única (`qa933-online-patient@example.invalid`, clínica BPR), apagada ao final. Em nenhum teste o botão final de envio foi clicado — sempre parou na prévia, então nenhum e-mail real saiu.

| # | Cenário | Resultado |
|---|---|---|
| B1 | Painel "Email to patient" (botão "Write email") aparece acima da caixa antiga na aba Messages | APROVADO — confirmado por posição no DOM |
| B2 | Escrever assunto/corpo em EN → "Preview" → iframe com o HTML exato, logo carregado de fato (`naturalWidth/Height` verificados, não só a tag) | APROVADO |
| B3 | Caixa antiga "Write your message to the patient…": Enter abre diálogo de prévia com o texto exato, sem enviar; só o botão do diálogo envia | APROVADO — item de maior risco (mudança feita depois do QA local), confirmado que subiu certo |
| B4 | Formulário "New Appointment": checkbox "Send the confirmation email now (no preview)" desmarcado por padrão | APROVADO |

Console do navegador: 0 erros JS. Limpeza: fixture apagada (cascade); SELECT final confirmou 0 `patient_outbound_emails`, 0 `ClinicMessage` com "QA933", histórico "Emails sent" vazio (nada foi realmente enviado).

Screenshots: `screenshots/online-b1-messages-tab.png`, `-b2-composer-write.png`, `-b2-composer-preview.png`, `-b2-composer-preview-logo-check.png`, `-b3-old-box-preview-dialog.png`, `-b4-new-appointment-checkbox.png`.
