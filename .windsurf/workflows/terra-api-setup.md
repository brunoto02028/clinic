---
description: Terra API Wearable Integration — Setup, Testing & Expected Results
---

# Terra API Integration — Guia Completo

## Estado Actual

| Componente | Local | Produção |
|---|---|---|
| Schema DB (`WearableConnection`, `WearableDataPoint`) | ✅ Migrado | ❌ Precisa deploy |
| `POST /api/biohacking/terra/webhook` | ✅ Funciona | ❌ 404 — precisa deploy |
| `GET /api/biohacking/terra/connect` (gera widget URL) | ✅ Funciona | ❌ 404 — precisa deploy |
| `GET /api/biohacking/terra/status` | ✅ Funciona | ❌ 404 — precisa deploy |
| UI do paciente (botão Connect Wearable) | ✅ Visível | ❌ Precisa deploy |
| Admin monitoring (dados wearable por paciente) | ✅ Visível | ❌ Precisa deploy |

> **Próximo passo obrigatório: fazer deploy** (`/deploy`)

---

## Passo 1 — Criar conta Terra API

1. Vai a https://dashboard.tryterra.co
2. Cria uma conta (plano Sandbox gratuito para testes)
3. No dashboard, vai a **API Keys** e copia:
   - `x-api-key` → vai para `.env` como `TERRA_API_KEY`
   - `dev-id` → vai para `.env` como `TERRA_DEV_ID`

---

## Passo 2 — Adicionar variáveis de ambiente

### Local (`.env`):
```
TERRA_API_KEY=terra_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TERRA_DEV_ID=terra-dev-xxxxxxxxxx
```

### Produção (painel Coolify):
1. Vai ao painel Coolify → `BAIntelligence` → `production` → app `clinic`
2. Aba **Environment Variables**
3. **Add Environment Variable**:
   - `TERRA_API_KEY` = (valor do Terra dashboard)
   - `TERRA_DEV_ID` = (valor do Terra dashboard)
4. Guarda — o serviço faz redeploy automático

---

## Passo 3 — Configurar Webhook no Terra Dashboard

1. No Terra Dashboard → **Webhooks**
2. Adiciona URL:
   ```
   https://bpr.rehab/api/biohacking/terra/webhook
   ```
3. Selecciona os eventos:
   - ✅ `auth` — quando paciente liga wearable
   - ✅ `deauth` — quando paciente desliga
   - ✅ `sleep` — dados de sono diários
   - ✅ `body` — HRV, frequência cardíaca, temperatura
   - ✅ `activity` — passos, calorias, minutos activos
   - ✅ `daily` — sumário diário agregado
4. Guarda o webhook

---

## Passo 4 — Deploy

```bash
# Via workflow do Windsurf:
/deploy
```

Depois do deploy, verifica:
- `https://bpr.rehab/api/biohacking/terra/webhook` → deve retornar 405 (Method Not Allowed ao fazer GET) — significa que a rota existe
- `https://bpr.rehab/api/biohacking/terra/connect` → deve retornar 401 Unauthorized ao fazer GET sem sessão — significa que a rota existe

---

## Passo 5 — Testar com um paciente

1. Faz login como paciente em `https://bpr.rehab/dashboard`
2. Vai a **Biohacking & Performance** no menu
3. Clica **"Connect Wearable"**
4. O widget Terra abre com os providers disponíveis (Garmin, Oura, Whoop, etc.)
5. Selecciona o provider e autoriza com as credenciais do wearable
6. Após autorização, Terra redirige para:
   ```
   https://bpr.rehab/dashboard/biohacking?connected=1
   ```
7. O card "Wearable Integration" mostra o provider conectado

---

## O que acontece depois da ligação

### Fluxo automático:
```
Paciente autoriza wearable
        ↓
Terra envia webhook POST /api/biohacking/terra/webhook (type: "auth")
        ↓
Sistema guarda WearableConnection na DB (provider + terraUserId)
        ↓
Terra envia webhooks diários (sleep, body, activity, daily)
        ↓
Sistema guarda WearableDataPoint por dia/tipo
        ↓
Dados aparecem automaticamente no:
  - Portal do paciente (/dashboard/biohacking) — snapshot
  - Admin monitoring (/admin/biohacking) — por paciente
```

---

## Dados sincronizados por provider

| Campo | Garmin | Oura | Whoop | Apple | Fitbit |
|---|---|---|---|---|---|
| `sleepScore` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `sleepDuration` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `deepMinutes` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `remMinutes` | ✅ | ✅ | ✅ | — | ✅ |
| `sleepEfficiency` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `hrv` (rMSSD) | ✅ | ✅ | ✅ | ✅ | — |
| `restingHr` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `hrvScore` (recovery) | — | ✅ (readiness) | ✅ | — | — |
| `bodyTemperature` | — | ✅ | — | ✅ | — |
| `spo2` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `steps` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `activeCalories` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `stressScore` | ✅ (Garmin) | — | — | — | — |

---

## Resultado esperado no portal do paciente

Após ligar wearable e esperar sincronização (normalmente 1-24h):

**Card "Wearable Integration":**
- Badge verde "1 Connected" com nome do provider
- Data do último sync
- Snapshot: Sleep Score · HRV · Resting HR · Recovery

**Funcionalidade futura:**
- Gráfico de HRV ao longo do tempo
- Correlação HRV com qualidade de sono
- Alertas automáticos (HRV baixo → protocolo de recuperação)

---

## Resultado esperado no admin (/admin/biohacking)

Por cada paciente com wearable ligado, aparece linha roxa:
```
GARMIN · 2026-06-14   HRV 52ms   Sleep 78%   RHR 58bpm   Recovery 71%
```

---

## Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Botão "Connect Wearable" não redirige | `TERRA_API_KEY` não definida | Adicionar ao `.env` / Coolify |
| Webhook retorna 401 | Assinatura HMAC inválida | Verificar `TERRA_API_KEY` no Coolify |
| Dados não aparecem após ligação | Webhook não configurado | Verificar URL do webhook no Terra Dashboard |
| Provider não listado no widget | Plano Sandbox limitado | Upgrade para plano Pro no Terra |

---

## Planos Terra API

| Plano | Preço | Providers | Histórico |
|---|---|---|---|
| **Sandbox** | Grátis | Limitado (teste) | 30 dias |
| **Starter** | ~$99/mês | Todos | 1 ano |
| **Pro** | ~$299/mês | Todos + premium | Ilimitado |

> Para começar, Sandbox é suficiente para testar com o teu próprio wearable.
