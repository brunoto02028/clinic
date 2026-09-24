# QA online (produção) — atividade 074

**Data:** 24/09/2026 · **Alvo:** `https://bpr.clinic`
**Builds:** `CPM48YsKSPCXDp4q0wO5c` (commit `9af37ef7`, PR #95) e `gDiNEwTibsb44Ay8PFRet`
(commit `cf178bb6`, PR #96)
**Resultado:** ✅ **11 verificações, 0 falhas**, nos dois builds. Script: `.qa-tmp/qa-online-074.sh`.

Tudo anônimo e de leitura: nenhuma sessão de paciente, nenhum dado criado, **nenhum paciente real
tocado**. O que se prova é que as rotas novas existem, estão atrás do gate certo, e que a única
rota pública de propósito responde como a Withings exige.

## O que passou

| Verificação | Resultado |
|---|---|
| Webhook, `userid` desconhecido | `{"status":0}` — responder erro faria a Withings desativar a inscrição |
| Webhook `GET` e `HEAD` | 200 — é o que eles checam antes de aceitar a inscrição |
| `/admin/measurements/inbox` anônimo | 307 → /login |
| `/api/admin/measurement-sessions` anônimo | 307 |
| `/api/admin/measurements/unassigned` anônimo | 307 |
| `/api/patient/exercise-clearance` anônimo | 307 |
| `/api/admin/patients/x/report` | 307 — **não** 404: a rota antiga que eu tinha sobrescrito está de volta |
| `/api/admin/patients/x/report/data` | 307 |
| `/api/admin/patients/x/report/pdf` | 307 |
| Estado forjado no callback de wearable | `?connected=0&error=invalid_state` — a proteção da 070 continua de pé |

## Schema em produção

A checagem que mais importava, porque o `start.sh` engole a falha do `prisma db push` com
`|| echo warning` — um push abortado deixaria o container rodando sem as tabelas novas, com deploy
verde. Log do container no primeiro deploy:

```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "bpr_clinic", schema "public"
🚀  Your database is now in sync with your Prisma schema. Done in 1.80s
```

E no segundo: `The database is already in sync with the Prisma schema.`

Foi por isso que o índice `@@unique([provider, providerUserId])` ficou **fora** deste deploy: uma
linha duplicada em produção faria o push abortar inteiro. Volta depois de conferir duplicatas lá.

## As regras de automação não existiam em produção

Descoberto durante este QA: `/admin/automation` não listava nada em produção, porque o seed sempre
foi um `tsx` rodado à mão contra um banco e ninguém o rodou lá. O comportamento nunca esteve errado
— sem regra, `getBpThresholds` e `getExerciseBpLimits` caem exatamente nos mesmos números —, mas a
linha que a tela do admin edita não existia, o que torna falsa a promessa da T-3 e da T-11.

Corrigido no PR #96 (`scripts/seed-automation-rules.js`, rodado no boot). Log do deploy:

```
[start.sh] Seeding automation rules...
[seed-automation-rules] created ADHERENCE_DAILY_REMINDER
[seed-automation-rules] created ADHERENCE_DAILY_ALERT
[seed-automation-rules] created BP_THRESHOLDS
[seed-automation-rules] created EXERCISE_BP_LIMITS
```

`created` nas quatro confirma o diagnóstico: não havia nenhuma.

## Terceiro deploy — T-8, T-10 e T-13 (24/09/2026, build `3WJ_b7xauAgfaAgytOVH8`, PR #97)

Mesmo script, agora com duas verificações a mais (a rota de aceite do aviso): **13 ok, 0 falhas.**

```
ok   /api/patient/monitoring-consent anônimo  (307)
ok   POST sem sessão                          (307)
```

Schema e regras, do log do container:

```
🚀  Your database is now in sync with your Prisma schema. Done in 1.61s
[start.sh] Seeding automation rules...
[seed-automation-rules] updated ADHERENCE_DAILY_REMINDER
[seed-automation-rules] updated ADHERENCE_DAILY_ALERT
[seed-automation-rules] updated BP_THRESHOLDS
[seed-automation-rules] updated EXERCISE_BP_LIMITS
```

`updated` — na primeira vez foi `created`. O seed de boot está mantendo as regras a cada deploy.

**Janela observada, que vale registrar:** o `start.sh` sobe o servidor **antes** de aplicar o schema
(de propósito, para o site não ficar fora do ar durante o deploy). Entre o `✓ Ready` e o
`in sync` passaram-se alguns segundos em que o código novo servia tráfego com o banco velho — nesse
intervalo, `/api/patient/monitoring-consent` e o conectar-aparelho responderiam 500. Não houve
tráfego real nessa janela, mas é uma consequência real do desenho atual do `start.sh`.

## Não coberto por este QA

- **Qualquer coisa que exija sessão** em produção (abrir janela de medição, caixa de entrada,
  relatório, bloqueio de treino). A regra do projeto é usar um paciente de teste identificado; não
  criei um em produção nesta passagem.
- **O fluxo real da Withings** (OAuth do aparelho da clínica, inscrição no webhook, medida
  chegando). Depende de promover a aplicação de `Development` para produção.

## Achados fora do escopo, vistos no log de produção

1. `[seed-guides] error Error: Cannot find module 'iobuffer'` — o seed de guias falha em todo boot e
   o erro é engolido pelo `|| echo`. É anterior a esta atividade.
2. Um `Traceback` do Prisma aparece antes do sync do schema no log; não impediu o `in sync`, mas
   vale olhar com calma.
