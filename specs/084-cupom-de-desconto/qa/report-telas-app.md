# QA — as telas do app do paciente (084, T-3)

**Data:** 26/09/2026 · **Alvo:** Expo Web em `localhost:8081`, API em `192.168.1.192:4100` (a mesma
`:4100` local, pelo IP de LAN que o Expo injeta)
**Veredito: ✅ aprovado** — os oito itens executados **na tela**, pela primeira vez em quatro
rodadas. Nenhum defeito do cupom.

Relatado por agente de QA; salvo aqui pela sessão principal porque a escrita do arquivo foi
bloqueada no ambiente dele. **21 screenshots em `qa/screenshots/`**, prefixo `t-3-`.

Isto fecha os cenários que `report-t-3-t-4.md` e `report-reteste.md` deixaram como *não executados*:
3.1, 3.2, 3.3, 3.5, 3.6 — mais 3.7, 3.8, a recusa do cupom no checkout e a porta do laboratório.

**O bloqueio que impedia tudo** era o `PushRouter` estourando no alvo web (`ExpoNotifications.
getLastNotificationResponse`), corrigido antes desta rodada. Carga das telas: **0 erros de console**.

## Placar

| # | cenário | resultado |
|---|---|---|
| 3.1 | cupom válido em Book appointment | ✅ `GBP 100.00` riscado, `GBP 80.00` em destaque, campanha nomeada |
| 3.2 | cupom inválido mostra **o motivo** | ✅ **seis** motivos, frases distintas, EN e PT |
| 3.3 | remover devolve o preço cheio | ✅ `price-original` some |
| 3.4 | a prévia não gasta o cupom | ✅ ~15 prévias → zero resgates |
| 3.5 | sem digitar nada, a tela é a de antes | ✅ campo fechado, só o link |
| 3.6 | cupom de 100% numa consulta | ✅ `url: null`, `covered: true`, consulta **CONFIRMED**, zero sessões da Stripe |
| 3.7 | exceção de preço da 082 + cupom | ✅ £40 → £32, e nada revela que é exceção |
| 3.8 | telas do laboratório | ✅ nenhum campo de cupom em três telas |
| — | recusa do cupom no checkout | ✅ *"That code did not apply"* com o motivo e o que fazer |
| — | porta do laboratório (`switch-area`) | ✅ a linha aparece; o seletor abre e **fica** |

## As seis recusas, palavra por palavra

| cupom | situação | texto em `coupon-field-refusal` |
|---|---|---|
| inexistente | — | "We do not recognise that code." |
| `QA084-EXPIRED` | `endsAt` no passado | "That code has expired." |
| `QA084-PLANONLY` | escopo errado | "That code does not apply to this purchase." |
| `QA084-HERS` | mirado em outro | "That code was issued for another patient." |
| `QA084-OFF` | desligado | "That code is no longer being accepted." |
| `QA084-SOON` | ainda não começou | "That code is not valid yet." |

"No longer being accepted" e "has expired" são frases diferentes para situações diferentes — é o
que leva a ações diferentes. Em português, o mesmo conjunto, verificado trocando o
`preferredLocale` do paciente (e devolvido ao fim).

## A cortesia de 100%, ponta a ponta

```
tela antes:  GBP 100.00 riscado · GBP 0.00 · "QA084-FULL · QA084 cortesia" · "GBP 100.00 off"
resposta:    200 { url: null, covered: true, message: "Your code covered this in full…" }
banco:       consulta CONFIRMED · resgate { 100 → 0, stripeSessionId: null, confirmedAt: … }
Stripe:      nenhuma sessão criada, nenhuma chamada
```

## A recusa no checkout — a correção do dia

Cupom válido na prévia, retirado do ar antes de confirmar. O que o app passou ao diálogo:

```
título: That code did not apply
corpo:  That code has expired.

        Your slot is held. Remove the code and confirm again to pay the normal price.
```

E em português, o equivalente. **Não** é mais "Booked, not paid yet" numa tela sem botão de pagar.
A consulta fica `PENDING` — o horário está mesmo reservado, como a frase promete — e nenhum resgate
é gravado.

## O que **não** é verificável na web

**`Alert.alert` não existe no alvo web.** Em `react-native-web` o módulo é `class Alert { static
alert() {} }` — não cai em `window.alert`. O agente instrumentou o **navegador** (não o código) para
capturar os argumentos, então o **texto** está provado letra por letra; **a caixa desenhada não**.
Vale um passe no simulador antes de confiar no recorte do diálogo do iOS.

Gesto, layout e rolagem são os do navegador. O Checkout da Stripe não foi aberto em nenhum cenário —
nem deveria, nos dois exercitados.

## Achados

| # | severidade | o quê | estado |
|---|---|---|---|
| **W-1** | média (só navegador) | `x-platform` fora do `Access-Control-Allow-Headers`: **todo** checkout de consulta por cliente web é bloqueado no preflight | **aberto — decisão do Bruno** |
| **W-2** | baixa (só sem chave) | `getStripe()` rodava antes do ramo da cortesia e fora do `try`: sem `STRIPE_SECRET_KEY`, um 500 de corpo vazio | **corrigido** |
| **N-1** | cosmético | com cortesia de 100% a tela dizia `GBP 0.00` · "paid when you book" | **corrigido** |
| O-1 | observação | `fullAccessOverride` ignora `mod_ba`/`mod_clinica` negados, mas **não** `mod_lab` | registrado |
| O-2 | observação | sem `TreatmentType` cadastrado, "Confirm booking" nunca habilita — e o comentário no código diz o contrário | registrado, pré-existente |

**W-1 em detalhe.** `mobile/src/api/booking.ts` manda `x-platform: mobile` (decisão da 083, para o
retorno da Stripe voltar ao app). A lista permitida tem dois cabeçalhos:

```
middleware.ts:63        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
lib/mobile-cors.ts:14   "Access-Control-Allow-Headers": "Content-Type, Authorization"
```

No aparelho não existe CORS e isso nunca aparece. Na web e numa futura PWA, o pagamento **não sai**,
e o app cai no `catch`. É a pergunta de produto: a web é alvo? Se sim, são duas linhas.

## Nota de ambiente

O navegador do Playwright MCP é **compartilhado entre agentes**. No meio do 3.2 a aba do QA navegou
sozinha para `bpr.clinic/terms` — era a sessão principal verificando o deploy no mesmo navegador. O
agente investigou antes de reportar (aba única, `document.referrer` vazio, o bundle do app não tinha
como pedir aquela URL) e a sessão principal confirmou. **Quem repetir este QA com outro agente ativo
deve conferir `location.href` antes de cada medição.**

## Estado do banco local

Só `INSERT`/`UPDATE`, nenhum DDL. Produção intocada. Criados para viabilizar a medição:
`MedicalScreening` para os dois pacientes, `TherapistAvailability`, um `TreatmentType`, e quatro
cupons (`QA084-HERS`, `QA084-OFF`, `QA084-SOON`, `QA084-PULL`). Devolvidos ao lugar: o
`preferredLocale` do A, o `QA084-PULL`, e os overrides do B. Deixado de propósito: o A com
`mod_lab` liberado (é o que permite repetir a porta e o 3.8) e a consulta CONFIRMED da cortesia,
que é a evidência dela.

## O que falta para a 084

1. **R-1 do reteste** — quem mede se o furo fechou é o harness de rota, não a tela.
2. **Decidir sobre W-1** (a web é alvo?).
3. **Um passe no simulador** para a caixa da recusa.
4. `PACKAGE` e `TREATMENT_PLAN` seguem com servidor pronto e nenhuma tela que colete o código.
5. QA online depois do deploy, conferindo o commit pela lista de deployments do Coolify.
