# QA report — T-2 (Composer + histórico) — atividade 068

**Veredito: APROVADO** (cenários 8–11, 18, 20). Console do navegador sem erro de JS de aplicação em nenhum fluxo.

| # | Cenário | Resultado | Evidência |
|---|---|---|---|
| 8 | Abrir composer, avançar sem escrever | APROVADO | botão "Preview" desabilitado mesmo só com assunto — `screenshots/t-2-composer-empty-preview-disabled.png` |
| 9 | Escrever → prévia (hash igual ao HTML enviado, iframe sandboxed, `<img>` da logo) → enviar → toast + item no histórico | APROVADO | `t-2-composer-preview.png`, `t-2-send-ok-toast-and-history.png` |
| 10 | Editar depois da prévia | APROVADO | botão "Send" some, exige nova prévia com hash novo — `t-2-composer-edit-after-preview-needs-new-preview.png` |
| 11 | EN/PT nos rótulos e no `<html lang>`; painel oculto para personal (API 403 confirmada) | APROVADO | `t-2-composer-pt.png`, `t-2-composer-preview-pt-only.png`, `t-2-personal-studio-no-email-panel.png` |
| 18 | Histórico "Emails sent": assunto/data/autor/status (Failed em vermelho), expandir mostra iframe com HTML exato | APROVADO | `t-2-history-expanded.png`, `t-2-history-failed-row.png` |
| 20 | Login personal (estúdio): painel de e-mail some da aba Messages, botão "Email confirmation" some da agenda, diálogo "New Session" sem o checkbox, API 403 | APROVADO | `t-2-personal-studio-no-email-panel.png`, `t-3-personal-studio-agenda-no-email-button.png`, `t-3-personal-studio-new-session-dialog.png` |

Regressão: a aba Messages continua enviando mensagens normais (`t-2-regression-normal-message-sent.png`), demais abas da ficha carregam sem erro. Paciente sem e-mail: botão "Write email" desabilitado (`t-2-patient-without-email-disabled.png`).

## Achado (cosmético, não corrigido)
Toast duplicado ao enviar e-mail ("Email sent" do composer + um segundo toast de notificação genérica). Não investigado a fundo — não bloqueia, não afeta o envio nem o registro.

## Correção pós-QA: prévia também na caixa de mensagem avulsa
Fora do escopo original dos cenários 1–20, o Bruno pediu explicitamente (22/09) que a caixa "Write your message to the patient…" (aba Messages, separada do composer de e-mail) também exigisse prévia antes de enviar. Implementado em `components/admin/patient-messages-tab.tsx`: Enter e o botão "Send to patient" agora só abrem um diálogo com o texto exato (e o anexo, se houver); só o botão de confirmação do diálogo chama o envio real. Verificado por code review (sem QA de UI adicional, por já ser um padrão idêntico ao do composer, já testado nos cenários 8–10): o diálogo renderiza os mesmos `draft`/`draftTitle`/`file` que `send()` usa, então prévia e envio nunca divergem.
