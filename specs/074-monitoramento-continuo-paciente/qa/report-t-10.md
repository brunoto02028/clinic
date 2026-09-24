# QA Report — T-10: Desconectar revogando o acesso

**Data:** 24/09/2026 · **Servidor:** `http://localhost:4010` (deste worktree)
**Dados:** prefixo `qa-t8t10-`. Conexão de teste com tokens **selados** por `lib/crypto-at-rest.ts`, como o resto do código.
**Resultado geral:** ✅ **aprovado**, com uma ressalva — **corrigida depois deste QA**.

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 6 | `DISCONNECTED` + tokens apagados no banco | API + DB | ✅ |
| 7 | Resposta traz `providerRevokeUrl` | API | ✅ |
| 8 | Histórico já sincronizado permanece | DB antes/depois | ✅ |
| 9 | Falha ao revogar não impede a desconexão, e fica no log | Integração | ✅ |
| 10 | UI: aviso + link, EN e PT | UI | ✅ |
| 11 | Provider que o paciente não tem → 404 sem efeito colateral | API + DB | ✅ |
| — | "Token antigo não serve mais" / "nenhuma notificação depois" | — | ⚠️ não executável |

## Evidências

**6/7/8 — antes e depois da chamada:**

```json
antes:  {"status":"CONNECTED",
         "accessToken":"v1.DeePBA4-A2Hr04Sn.…","refreshToken":"v1._765koNqbwjxiOIG.…",
         "tokenExpiresAt":"2026-09-24T07:38:07.061Z",
         "accessTokenUnsealed":"qa-t8t10-fake-access-token"},
        histórico {"BloodPressureReading":2,"WearableDataPoint":2}

POST /api/wearables/disconnect → 200
{"ok":true,"providerRevokeUrl":"https://account.withings.com/partner/my_apps"}

depois: {"status":"DISCONNECTED","accessToken":null,"refreshToken":null,"tokenExpiresAt":null},
        histórico {"BloodPressureReading":2,"WearableDataPoint":2}
```

Tokens **apagados**, não só marcados. O prontuário fica.

**9 — as quatro revogações falharam de verdade contra a Withings** (token de teste), e a
desconexão aconteceu mesmo assim:

```
[wearables/disconnect] notify revoke appli=1:  Withings status 401: … invalid_token …
[wearables/disconnect] notify revoke appli=16: Withings status 401: … invalid_token …
[wearables/disconnect] notify revoke appli=44: Withings status 401: … invalid_token …
[wearables/disconnect] notify revoke appli=4:  Withings status 401: … invalid_token …
HTTP 200 · conexão: DISCONNECTED, tokens null
```

**10 — a tela, nos dois idiomas** (`screenshots/t-10-devices-{antes,depois}-{en,pt}.png`):

> **Disconnected.** We deleted the access keys and stopped the notifications. Data already synced stays in your record.
> To withdraw the authorisation at the manufacturer as well, do it in your account: https://account.withings.com/partner/my_apps

> **Desconectado.** Apagamos as chaves de acesso e paramos as notificações. O histórico já sincronizado continua no seu prontuário.
> Para retirar a autorização também do lado do fabricante, faça isso na sua conta: …

**11 —** `{"provider":"oura"}` → `404 {"error":"Not found"}`, com o banco idêntico depois. Sem bearer
→ 307 (o middleware nega antes da rota).

## A ressalva ❌ → corrigida

**A tela dizia "paramos as notificações" mesmo quando as quatro revogações falharam com 401.** A
rota gravava `status: 'DISCONNECTED'` sempre — sucesso e falha total produziam exatamente a mesma
linha —, não informava a UI, e a UI não tinha como distinguir. É precisamente a promessa falsa que
a própria tarefa argumenta que não se deve fazer.

**Corrigido:**
- a rota acompanha o resultado das quatro revogações e devolve `subscriptionsRevoked`;
- a conexão passa a gravar `DISCONNECTED_REVOKE_FAILED` quando falharam, um estado que o admin vê;
- o webhook passou a exigir `status === "CONNECTED"` em vez de "não `DISCONNECTED`", para que o
  estado novo não signifique acidentalmente "continue aceitando dados";
- a tela, quando a revogação não confirmou, diz o que de fato aconteceu: *"Apagamos as chaves de
  acesso aqui, mas não conseguimos cancelar as notificações do fabricante — o token já não era mais
  válido"*, e o link passa a ser *"é o que interrompe tudo"* em vez de um complemento opcional.

## Não executável

"Depois de desconectar, o token antigo não serve mais na Withings" e "nenhuma notificação chega
depois" exigem conta real com a inscrição da T-9 ativa. Além disso, como a própria tarefa documenta,
**a Withings não tem endpoint para a aplicação revogar o próprio token** — só o titular, na área
dele. O primeiro critério não é alcançável pelo produto; o que o código pode fazer (cancelar as
inscrições, apagar os tokens, dizer a verdade) está provado acima.

## Observação fora do escopo

A seção de dados abaixo dos cards mostra "No data yet / Nenhum dado ainda" **mesmo antes** da
desconexão, com histórico presente no banco. É o filtro da própria seção (`/api/wearables/data?days=7`),
não efeito da desconexão — mas vale checar se o paciente enxerga o histórico que o aviso promete
manter.
