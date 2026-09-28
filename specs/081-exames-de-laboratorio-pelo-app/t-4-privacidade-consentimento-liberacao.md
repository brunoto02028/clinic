# T-4: Privacidade, consentimento e liberação do módulo

**Status:** concluído — QA aprovado (qa/report-t-3-t-4.md) e revisão feita em 25/09/2026
**Depende de:** T-1

## Objetivo
O texto e o consentimento que precisam existir antes do primeiro pedido sair — e só então ligar o
módulo no app.

## Contexto
Resultado de exame de sangue é dado de saúde de categoria especial. A política de privacidade
atual, revisada em 25/09/2026, cobre o app mas **não menciona exame laboratorial** nem que um
terceiro (a LML) processa amostra e dado.

A Apple vai olhar isso. E o módulo está escondido por `EXPO_PUBLIC_SHOW_LAB=false` — que é a forma
certa de manter até aqui.

## Passos
1. Seção nova na política: que exame é vendido, que a LML processa, que dado vai para lá (nome,
   nascimento, endereço, telefone), quanto tempo guardamos o resultado, e o direito de apagar.
2. Consentimento específico antes do primeiro pedido, versionado como os outros (`ConsentLog`,
   `termsVersion`), em EN e PT — inglês primeiro.
3. Frase de não-diagnóstico na tela de resultado e em qualquer e-mail.
4. Revisar o que sai em push: nada de nome de exame nem valor.
5. Só então: `EXPO_PUBLIC_SHOW_LAB=true` no `eas.json` — **que muda o fingerprint e exige build
   novo**, então entra num build planejado, não de surpresa, e o OTA não alcança binário antigo.

## Arquivos afetados
- `app/privacy/page.tsx`
- `lib/lab-consent.ts` (novo)
- `mobile/eas.json`

## Decisão de execução (25/09/2026)

O passo 5 (`EXPO_PUBLIC_SHOW_LAB=true` no `eas.json`) **não** entra nesta tarefa. Ele muda o
fingerprint do app e corta o canal de update do binário instalado, então só acontece num build
planejado — e só depois que a compra estiver aberta de ponta a ponta (T-5 a T-9). O que esta
tarefa entrega: a seção 7 da política, o consentimento versionado (`LAB_TESTS_CONSENT_ACCEPTED`,
v1.0) com rota `GET/POST /api/patient/lab-consent`, o portão no `POST /api/mobile/labs/orders`
(403 `consent_required` antes de qualquer outra checagem) e o cartão de aceite na tela do exame.

## Critérios de aceite
- [ ] Pedido sem consentimento → 403 com `code`, EN e PT
- [ ] O consentimento é versionado e registrado com data e versão
- [ ] A política nomeia a LML e diz o que vai para lá
- [ ] Nenhum push cita exame ou valor
- [ ] A mudança no `eas.json` entra num build planejado, com aviso de que o OTA não alcança o
      binário já instalado
