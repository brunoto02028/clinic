# T-7: Porte — financeiro e assinatura

**Status:** pendente
**Depende de:** T-1

## Objetivo
Levar para o app o que o paciente vê sobre pagamento, pacote e assinatura.

## Contexto
Agrupamento provisório, confirmado pela T-1.

Candidatas: `billing`, `membership`, `cancellation-policy`.

⚠️ **Loja:** fluxo de compra dentro de app iOS esbarra na regra de in-app purchase da Apple. O app hoje já tem `membership.tsx` no módulo BA com Stripe via deep link — seguir esse precedente, ou deixar a tela só informativa com a ação na web.

Cobrança do personal via Stripe Connect (ativ. 028) está em prod mas desligada — não confundir os dois fluxos.

## Passos
1. Definir, com o Bruno, se o app permite ação de pagamento ou é só leitura + deep link.
2. Portar as telas conforme a decisão.
3. `cancellation-policy` é conteúdo estático — checar se vem do backend ou é texto fixo bilíngue.

## Arquivos afetados
- `mobile/src/api/*.ts`
- `mobile/app/(app)/(clinica)/*.tsx`

## Critérios de aceite
- [ ] Decisão sobre pagamento in-app registrada no plan.md
- [ ] Nenhum fluxo que viole a regra de IAP da Apple
- [ ] Valores e status batem com a web para o mesmo paciente
