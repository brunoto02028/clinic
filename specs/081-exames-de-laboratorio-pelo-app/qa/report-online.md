# QA online — atividade 081, T-1 a T-4 (produção)

**Data:** 25/09/2026 · **Alvo:** `https://bpr.clinic` · **Commit em produção:** `2d85b46c`
(deployment `finished`, container novo com `uptime 39s` às 22:32 UTC).

Paciente de teste identificado: `qa.teste.080@bpr.clinic` (criado no QA online da 080). Nenhum
paciente real, nenhuma escrita além do login.

## O deploy — e a falha que ficou pelo caminho

O primeiro deploy (`6566b3bc`) **falhou na guarda do Dockerfile**: `start.sh` passou a rodar
`scripts/seed-lab-products.js` e a imagem não o copiava. O Coolify manteve o container anterior
(`uptime 7691s` medido durante a falha) — nada chegou a pacientes. Corrigido com a linha `COPY`
(PR #123) e redeployado.

```
🚀  Your database is now in sync with your Prisma schema. Done in 1.65s
[start.sh] Seeding lab products...
[seed-lab-products] 22 created (inactive), 0 refreshed; retail price and active flag untouched.
```

## Banco de produção

```
LabProduct: 22 | ativos: 0 | labReviewDays BPR: 2
enums: AWAITING_PATIENT, PROCESSING_ERROR, LAB_TESTS_CONSENT_ACCEPTED
tabelas: lab_test_registrations, lab_result_values
colunas lab_orders: clinicId, releasedToPatientAt, releaseNotePt
```

Migração aditiva aplicada; catálogo semeado inteiro **inativo** — nada à venda até a clínica ligar.

## O que o paciente recebe hoje

| chamada | resposta |
|---|---|
| `GET /api/mobile/labs/catalog` (bearer) | `{"products":[],"orderingEnabled":false,"reviewDays":2}` — nenhum custo no JSON |
| `GET /api/mobile/labs/catalog` sem token | 401 |
| `GET /api/mobile/labs/orders` | `{"orders":[],"reviewDays":2,"orderingEnabled":false}` |
| `POST /api/mobile/labs/orders` sem consentimento | 403 `consent_required`, EN + PT |
| `GET /api/patient/lab-consent?locale=pt-BR` | `accepted:false`, `version "1.0"`, texto em português nomeando a LML |
| `PATCH /api/mobile/labs/orders/x` | 410 — a confirmação sem pagamento não existe mais |

## O painel e a política

| chamada | resposta |
|---|---|
| `/admin/labs`, `/api/admin/labs/products`, `/api/admin/labs/orders` sem sessão | 307 para o login |
| `/privacy` (público) | "7. Laboratory Tests" ✓ · "London Medical Laboratory" ✓ · "finger-prick" ✓ · seções 1–15 sem número repetido |

## O que não foi medido, e por quê

| item | motivo |
|---|---|
| a tela do painel com sessão de staff | sem credencial de staff em produção; medido localmente no QA da T-2 com prints |
| telas nativas do app | exigem o build 15 (o módulo continua escondido por `SHOW_LAB=false`) |
| compra, pedido, registro, webhook, resultado | T-5 a T-9, esperam o token da sandbox da LML |
