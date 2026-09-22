# T-2: Composer em 3 etapas + histórico

**Status:** concluído (QA aprovado — qa/report-t-2.md; code review feito)
**Depende de:** T-1

## Objetivo
Interface para escrever, ver a prévia e enviar; histórico dos e-mails enviados.

## Passos
1. Modal com etapas Escrever → Prévia (iframe do HTML) → Enviar (botão explícito, com o destinatário mascarado).
2. Assunto/corpo EN e PT; idioma de envio (paciente / os dois).
3. Botão na ficha do paciente e na aba Messages; lista "Emails sent" com detalhe.

## Arquivos afetados
- components/admin/patient-email-composer.tsx
- components/admin/patient-messages-tab.tsx
- app/admin/patients/[id]/page.tsx

## Critérios de aceite
- [x] Não há como enviar sem passar pela prévia
- [x] Alterar o texto depois da prévia exige nova prévia
- [x] Histórico mostra assunto, data, idioma e resultado
- [x] EN/PT nos rótulos; oculto para o personal
