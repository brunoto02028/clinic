# T-6: Alertas dedicados restantes

**Status:** pendente
**Depende de:** T-1

## Objetivo
Fechar os gaps restantes da auditoria, todos seguindo o mesmo padrão mecânico já estabelecido nas tarefas anteriores.

## Contexto
Eventos, com o arquivo/template de origem:
- Cancelamento/reagendamento de consulta **pela paciente** — `app/api/appointments/[id]/route.ts:147` (template `APPOINTMENT_CANCELLED`). A mesma rota PATCH atende cancelamento pelo admin e pela paciente — só dispara o alerta novo quando quem fez a request foi a paciente (checar o actor já resolvido na rota).
- Avaliação corporal enviada — `app/api/body-assessments/capture/[token]/route.ts:309-312` (`BODY_ASSESSMENT_SUBMITTED`).
- Escaneamento de pé enviado — `app/api/foot-scans/[id]/upload-local/route.ts:212-215` (`FOOT_SCAN_SUBMITTED`).
- Pagamento confirmado — `app/api/webhooks/stripe/route.ts:126-128` (`PAYMENT_CONFIRMATION`).
- Pagamento de pacote confirmado — `app/api/webhooks/stripe/route.ts:172-174` (`PACKAGE_PAYMENT_CONFIRMED`).
- Consentimento aceito — `app/api/patient/consent/route.ts:48` (`CONSENT_CONFIRMED`).

## Passos
1. Pra cada evento acima, adicionar um `sendEmail()` dedicado pro admin (via `getAdminNotificationEmail`) logo após o envio do template existente pro paciente — assunto claro identificando o evento e a paciente, corpo com os dados relevantes do evento, link pra ficha.
2. No caso do cancelamento, adicionar a checagem "só alerta se foi a paciente que cancelou".
3. Non-blocking em todos, mesmo padrão try/catch já usado no resto do código.

## Arquivos afetados
- `app/api/appointments/[id]/route.ts`
- `app/api/body-assessments/capture/[token]/route.ts`
- `app/api/foot-scans/[id]/upload-local/route.ts`
- `app/api/webhooks/stripe/route.ts`
- `app/api/patient/consent/route.ts`

## Critérios de aceite
- [ ] Cada um dos 6 eventos dispara um alerta dedicado, distinto do BCC que já existia.
- [ ] Cancelamento feito pelo próprio Bruno (admin) NÃO dispara o alerta novo (só o paciente cancelando dispara).
- [ ] Nenhum dos fluxos existentes (o que acontece pro paciente) muda de comportamento.
