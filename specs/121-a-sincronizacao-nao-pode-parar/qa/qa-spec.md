# QA — 121: A sincronização não pode parar

**A regra desta atividade:** cada cenário tem de distinguir *a ligação está
viva*, *parou e precisa da pessoa*, e *tropeçou e volta sozinha*. Dois estados
não chegam — foi exactamente por os confundir que a ligação do Bruno ficou
`CONNECTED` e morta 27 dias.

## T-1 — O refresh é um de cada vez

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 1.1 | Unidade | Dois `withingsAccessToken` em paralelo | **um** refresh; os dois recebem o mesmo token |
| 1.2 | Unidade | Quatro em paralelo | idem — é o cron, o webhook, a tela e a sondagem |
| 1.3 | Unidade | Token que ainda serve | nenhum refresh |
| 1.4 | Unidade | Trava de há 2 minutos | o pedido passa — um processo morto não tranca |
| 1.5 | Unidade | O refresh falha | a trava é libertada na mesma |
| 1.6 | Banco | Dois processos **de verdade** (dois clientes Prisma) | uma linha de refresh; medir, não presumir |
| 1.7 | Mutação | Tirar a trava / a releitura | cada uma mata um teste nomeado |

## T-2 — O webhook não engole

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 2.1 | API | Webhook com a ingestão a rejeitar | `lastSyncError` guardado |
| 2.2 | API | Idem | a resposta continua `status: 0` — senão a Withings corta a assinatura |
| 2.3 | Unidade | `601: Same arguments in less than 10 seconds` | **não** marca `needsReauthAt` |
| 2.4 | Unidade | `invalid refresh_token` | marca |

## T-3 — Uma ligação morta grita

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 3.1 | Unidade | Renovação falha com `invalid refresh_token` | `needsReauthAt` + `status: "ERROR"` |
| 3.2 | Unidade | Renovação corre bem | o estado é apagado |
| 3.3 | **UI** | Tela do paciente com `needsReauthAt` | diz *"autorização expirada"* e oferece reconectar |
| 3.4 | **UI** | Idem, depois de reconectar | a pendência desaparece |
| 3.5 | UI | Ligação viva | **nenhuma** pendência |

## T-4 — A clínica vê

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 4.1 | UI | Lista de pacientes | quem tem `needsReauthAt` aparece marcado |
| 4.2 | UI | Ficha do paciente | diz desde quando, e o que falta |
| 4.3 | UI | Depois de reconectar | a marca sai dos dois sítios |

## T-5 — Medir em produção

| # | Tipo | Passos | Esperado |
|---|---|---|---|
| 5.1 | Produção | Uma semana depois do Bruno reconectar | a ligação não parou |
| 5.2 | Produção | Contador de esperas pela trava | **> 0** — se for zero, a corrida não era esta |
| 5.3 | Produção | Log do contentor | `in sync` (duas colunas novas) |

---

## QA em produção

1. Confirmar o commit pela lista de deployments do Coolify — o `buildDate` não prova nada.
2. `The database is already in sync` no log (T-1 e T-3 mexem no schema).
3. **Com o paciente de teste**, nunca com a conta real.
