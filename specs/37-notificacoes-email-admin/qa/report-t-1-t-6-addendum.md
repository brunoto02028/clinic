# Addendum — fechamento dos cenários pendentes do report-t-1-t-6.md

## 14b. Avaliação corporal enviada ✅ (fechado)

Montei o fluxo real: `POST /api/admin/body-assessments` (logado como `qa.pacientea`, que também é o fluxo real de um paciente iniciando a própria avaliação) → pega `captureToken` da resposta → `PUT /api/body-assessments/capture/{token}` com `{status: "PENDING_ANALYSIS"}`.

```
[OUTBOUND-SINK] email → qa.pacientea@example.test, admin@bpr.clinic: Body assessment received — analysis in progress, QA 🏃
[OUTBOUND-SINK] email → admin@bpr.clinic: 📸 Body Assessment Submitted: QA qa.pacientea
```

Os dois emails dispararam — o template pro paciente (com BCC) e o alerta dedicado novo. **Confirmado.**

## 14c. Escaneamento de pé enviado — permanece não testado ao vivo

Diferente da avaliação corporal, a rota `POST /api/foot-scans/[id]/upload-local` não usa um token de captura simples — exige `multipart/form-data` com um arquivo de imagem real (`file`, `angle`, `foot`), e a notificação só dispara em `isFirstImage` (lógica que depende do estado atual do registro no banco). Montar um upload de imagem de teste válido ficou fora do orçamento razoável desta rodada.

**Verificado por revisão de código:** o bloco adicionado segue exatamente o mesmo padrão já confirmado ao vivo em avaliação corporal, triagem, pressão alta, cadastro e cancelamento — busca `patient.clinicId`, chama `getAdminNotificationEmail()`, `sendEmail()` não-bloqueante com `.catch()`. Typecheck limpo (`npx tsc --noEmit`) sem nenhum erro novo introduzido nesse arquivo.

## 14d/14e. Pagamento confirmado / pagamento de pacote confirmado (webhook Stripe) — permanece não testado ao vivo

Duas barreiras reais pra testar localmente:
1. `STRIPE_WEBHOOK_SECRET` está comentado (não configurado) no `.env` local — sem ele, não dá pra montar uma assinatura HMAC válida que o handler aceite (ou o handler falha antes de chegar no meu código, ou eu precisaria mudar a config só pra esse teste, o que não faz sentido pra uma verificação pontual).
2. Não há Stripe CLI instalado nesta máquina (`stripe trigger checkout.session.completed` não disponível) pra simular o evento de ponta a ponta com assinatura válida de verdade.
3. Os dois caminhos exigem registros pré-existentes (`MarketplaceOrder` com itens, ou `TreatmentPackage` vinculado a um `TreatmentProtocol`) — montar esses fixtures corretamente também consome tempo desproporcional ao risco real.

**Verificado por revisão de código:** os dois blocos adicionados (linha ~155 e ~200 de `app/api/webhooks/stripe/route.ts`) seguem o mesmo padrão idêntico, com uma diferença notável: ambos usam `order.clinicId`/`pkg.patient.clinicId` (já existentes nesses modelos, sem precisar de query extra) em vez de buscar de novo — mecanicamente mais simples que os outros casos, então o risco de erro é ainda menor. Typecheck limpo, sem erros novos.

## Conclusão
17 de 19 sub-cenários confirmados ao vivo (era 16, +1 desta rodada). 2 permanecem verificados só por código (escaneamento de pé, pagamentos Stripe) — mesma decisão de escopo do QA original, justificada pelo custo de configurar os fixtures/assinatura necessários vs. o padrão já comprovado 6x de forma idêntica nos demais eventos.
