# Revisão de código — atividade 081, T-1 a T-4

**Data:** 25/09/2026 · **Revisor:** Claude (a revisão em nuvem `/code-review ultra` é acionada pelo
Bruno; esta é a revisão sobre o diff das quatro tarefas, feita depois dos QAs aprovados).

## O que foi revisado

`prisma/schema.prisma` (T-1), `lib/lab-*.ts`, `scripts/seed-lab-products.js`, `start.sh`,
`lib/clinic-waiting.ts`, `lib/admin-sections.ts`, `app/api/admin/labs/**`, `app/admin/labs/**`
(T-2), `app/api/mobile/labs/**`, `lib/lab-patient.ts`, `lib/lab-stage.ts`, `mobile/app/(app)/(lab)/**`,
`mobile/src/api/labs.ts`, `mobile/src/lib/lab-stage-copy.ts` (T-3), `lib/lab-consent.ts`,
`app/api/patient/lab-consent/route.ts`, `app/privacy/page.tsx` (T-4), e `__tests__/labs/*` (5 suítes,
58 testes).

## Achados e o que foi feito

| # | achado | gravidade | ação |
|---|---|---|---|
| R1 | `GET /api/admin/labs/orders?status=<qualquer>` passava a string direto ao Prisma — enum inválido derruba a rota com 500 (a F1 da 080) | média | corrigido: valor conferido contra a lista; desconhecido é ignorado |
| R2 | `patientOrder()` devolvia `o.items` inteiro; o `select` exclui o custo, mas quem chamasse com a linha completa vazaria `unitCost` | média | corrigido: lista explícita de campos; teste `patient-shape.test.ts` prova |
| R3 | `/admin/labs*` caía na seção *Schedule* — `matchRoutes` da seção Clinical não tinha o caminho (QA T-2) | baixa | corrigido; provado com `getActiveAdminNav` para 3 rotas |
| R4 | Lista de pedidos sem coluna de custo por linha (QA T-2) | baixa | corrigido |
| R5 | `DialogContent` da prévia sem `DialogDescription` (warning Radix, acessibilidade) | baixa | corrigido |
| R6 | `LabOrderItem.unitCost` tem `@default(0)`: uma rota que esqueça de gravar o custo passa em silêncio com margem = preço cheio (QA T-1) | média | **aceito com guarda**: o único produtor (`POST /api/mobile/labs/orders`) grava e o QA 3.3 mede; o default existe porque a migração aditiva exige valor para linhas antigas. Cenário 3.3 continua obrigatório na T-6 |
| R7 | `GET /api/mobile/labs/orders/<id de BASKET>` responde 200 (a lista filtra BASKET, o detalhe não) (QA T-3) | baixa | aceito: é o próprio carrinho do paciente, sem valor nem custo; a T-6 decide se o carrinho vira tela |
| R8 | `qa-spec` 6.5 dizia 403 para resultado não liberado; a T-3 escolheu 200 com `result: null` e `stage: in_review` — recusar diria "existe algo aqui" | — | spec alinhada à decisão |

## O que ficou de fora de propósito

- **`LAB_TESTS_CONSENT_ACCEPTED`** entrou no enum `ConsentAction` por `ALTER TYPE … ADD VALUE`
  (aditivo). Guard contra o `main`: zero DROP.
- **`EXPO_PUBLIC_SHOW_LAB`** continua `false`: ligar muda o fingerprint e corta o OTA. Só num build
  planejado, e só quando a compra estiver aberta de ponta a ponta.
- **Compra fechada** por `labOrderingEnabled()` (`LML_API_KEY` + `STRIPE_SECRET_KEY` +
  `LAB_ORDERING_ENABLED=true`). O `PATCH` que confirmava pedido sem pagamento virou 410.

## Achado fora do escopo — para o Bruno decidir

**`/admin/clinical-notes` mostra notas SOAP de outras clínicas** para o admin de uma clínica nova
(QA da T-2, print `t2-clinical-aba-lab-tests.png`): `getClinicContext` + `withClinicFilter` não
filtram quando o `clinicId` resolvido é nulo. É a mesma família das rotas antigas com
`session.user.clinicId` (memória de 16/09). **Não corrigido nesta atividade**, por regra: achado
fora do escopo é avisado, não consertado por conta própria. Recomendo atividade própria, curta,
migrando para `getActor`.

## Veredito

Aprovado para commit e deploy. Nada aqui vende nada nem muda o que o paciente vê hoje: o módulo
segue escondido no app, a compra está fechada no servidor, e o painel novo só aparece para a equipe.
