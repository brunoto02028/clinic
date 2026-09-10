# T-1: Guarda de e-mail e mensagens fora de produção

**Status:** concluído
**Trilha:** PLATAFORMA
**Depende de:** nenhuma

## Objetivo
Impedir que o ambiente local e o QA enviem e-mail, WhatsApp, SMS ou Telegram reais.

## Contexto
O `.env` local usa a chave do Resend, e o QA da atividade 19 mandou e-mails de verdade: 2 para o `ADMIN_EMAIL`. Todo QA desta atividade cria cadastros e agendamentos, então sem a guarda cada rodada dispara notificações.

## Passos
1. Mapear todos os pontos de envio: `lib/email.ts`, `lib/notify-patient.ts`, WhatsApp, Telegram, SMS e push.
2. Fora de `NODE_ENV=production`, ou com `OUTBOUND_MODE=sink`:
   - não enviar;
   - registrar `[OUTBOUND-SINK] canal → destino: assunto` no log.
3. Permitir exceções por `OUTBOUND_ALLOWLIST` (lista de destinos separados por vírgula).
4. O caminho de produção fica inalterado.

## Arquivos afetados
- `lib/email.ts`, `lib/notify-patient.ts` e os módulos de WhatsApp, Telegram, SMS e push (a mapear)

## Critérios de aceite
- [x] Agendamento local grava o registro e o log mostra `[OUTBOUND-SINK]`, sem nenhum `Sent via Resend`.
- [x] Destino na allowlist é enviado de fato.
- [x] Produção sem mudança de comportamento (revisão).

## Registro
- **QA:** `qa/report-t-1.md` — aprovado com ressalvas (R1: ID fixo do sink colidia com a unique de `EmailMessage.messageId`; R2: resíduos na limpeza). Corrigidas e retestadas: 98/98 testes; em runtime, 0 P2002 e 0 envio real.
- **Code review (`/code-review high`):** 1 achado, severidade baixa. `scripts/test-emails.ts` passaria a mostrar "✅ Sent" sem enviar nada. Corrigido: o script declara `OUTBOUND_MODE=live`, porque enviar de verdade é a função dele. Verificado sem problema: produção envia (`NODE_ENV=production` no Dockerfile e no compose), todos os canais estão cobertos, o guard vem depois da checagem de configuração e os IDs do sink são únicos.
- **Fora do escopo (avisado, não corrigido):** o agendador em segundo plano também roda no dev e publica posts agendados nas redes sociais; essa publicação não passa pelo guard.
