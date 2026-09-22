# QA report — T-3 (Modelos de confirmação de consulta/visita) — atividade 068

**Veredito: APROVADO** (cenários 12, 13, 17).

| # | Cenário | Resultado | Evidência |
|---|---|---|---|
| 12 | Modelo de visita domiciliar: 15:30Z hoje (BST) → mostra 16:30 e endereço; dezembro 16:30Z (GMT) → mostra 16:30 corretamente; fuso do processo (UTC/São Paulo/Tóquio) não afeta o resultado | APROVADO | `t-3-composer-template-home-today-1630bst.png`, `t-3-preview-home-visit-pt.png`, `t-3-composer-template-home-pt.png` |
| 13 | Atalho "Email confirmation" na consulta → abre a ficha na aba Messages com o composer preenchido; nada enviado sozinho | APROVADO | `t-3-agenda-email-confirmation-button.png`, `t-3-shortcut-opens-composer-prefilled.png` |
| 17 | Checkbox no diálogo New Appointment: desmarcado por padrão; marcado e desabilitado em pagamento online; toast "Nenhum email foi enviado…"/"No email was sent" quando desmarcado, PT e EN confirmados | APROVADO | `t-3-new-appointment-checkbox-default-unchecked.png`, `t-3-new-appointment-checkbox-online-checked-disabled.png`, `t-3-new-appointment-toast-no-email-sent.png`, `t-3-new-appointment-toast-email-sent-pt.png`, `t-3-new-appointment-dialog-pt.png` |

Nenhum texto novo contém "Rehab" isolado ou "fisioterapeuta" — confirmado por grep (só o comentário correto "nunca fisioterapeuta" em `lib/patient-email.ts`).
