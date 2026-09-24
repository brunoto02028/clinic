# QA Report — T-9: Webhook da Withings para medidas novas

**Data:** 24/09/2026
**Worktree:** `C:\Users\bruno\orca\workspaces\clinic\app_clinic`
**Servidor:** `http://localhost:4010` — `next dev -p 4010` deste worktree (confirmado por `netstat`
+ `Win32_Process`; log em `.qa-tmp/next-4010.log`)
**Dados de teste:** clínica `qa-t9t11-clinic`, pacientes `qa-t9t11-patient-a/b@example.com`,
conexões `qa-t9t11-wuid-a/b/broken`. Nenhum paciente real tocado. Tudo apagado ao final.

**Resultado geral:** ✅ **aprovado**

> A `qa-spec.md` não tinha seção para T-9 quando este QA rodou; os cenários foram derivados da
> tarefa e do pedido. A seção 9.x da qa-spec foi escrita depois, a partir daqui.

## Resumo

| # | Cenário | Tipo | Resultado |
|---|---------|------|-----------|
| 1 | `POST` sem sessão, `userid` desconhecido → 200 `{"status":0}`, nada gravado | API | ✅ |
| 2 | `GET` e `HEAD` na mesma URL → 200 (verificação da Withings) | API | ✅ |
| 3 | Rota fora do gate de sessão (sem 307 para /login) | API | ✅ |
| 4a | Mesma medida duas vezes → uma linha | API | ✅ |
| 4b | Linha antiga sem `withingsMeasureId` ganha o grpid, sem duplicar | API | ✅ |
| 4c | Dois pacientes no mesmo instante, grpids diferentes → duas linhas | API | ✅ |
| 5 | `userid` de conexão `DISCONNECTED` → 200, nada gravado | API | ✅ |
| 6 | Token inválido → 200, erro no log, nada gravado, servidor de pé | API | ✅ |
| 7 | `POST /api/wearables/sync` continua pelo mesmo `ingestWithings` | API | ⚠️ com ressalva |

## Evidências decisivas

**1 — `userid` desconhecido**

```
$ curl -sS -i -X POST http://localhost:4010/api/wearables/withings/webhook \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "userid=999999999&startdate=1790220000&enddate=1790221000&appli=4"
HTTP/1.1 200 OK
{"status":0}
```
Nada gravado. Responder erro faria a Withings **desativar a inscrição**, e inscrição desativada é
silenciosa — por isso é sempre `status: 0`.

**2 — verificação da URL**

```
GET  /api/wearables/withings/webhook 200 in 51ms
HEAD /api/wearables/withings/webhook 200 in 42ms
```

**3 — fora do gate**, comparado com rotas de controle no mesmo servidor, sem cookie:

```
/dashboard/treatment            → 307 → /login?callbackUrl=...
/api/patient/exercise-clearance → 307 → /login?callbackUrl=...
/api/wearables/withings/webhook → 200
```

**4 — deduplicação**, chamando `saveBloodPressure` contra o banco real:

```
4a  1ª chamada (webhook): saved=1 · 2ª (sync, mesmo grpid): saved=0 · rows=1     PASSA
4b  linha antiga grpid=null, mesmo horário → saved=0, a linha antiga GANHOU o grpid
    (o notes "linha antiga, pre-T9" prova que é a mesma linha)                   PASSA
4c  paciente A 120/78 grp-A e paciente B 145/91 grp-B no mesmo instante → 2 linhas PASSA
4d  a mesma medida de novo, já com grpid: saved=0                                 PASSA
```

**5 — conexão desconectada:** 200 e nenhuma linha `[withings/webhook]` no log — o `return` acontece
antes de qualquer fetch, que é o certo para uma inscrição órfã.

**6 — token inválido** (refresh que vai mesmo até a Withings e volta com erro):

```
{"status":0}  [http 200]
[withings/webhook] error: Withings status 503: Invalid Params: invalid refresh_token
POST /api/wearables/withings/webhook 200 in 228ms
GET /api/version → 200     (servidor de pé)
```

**7 — sync pelo mesmo caminho:**

```
POST /api/wearables/sync (bearer do paciente) → 502
{"error":"Withings status 401: ... invalid_token ..."}
[wearables/sync] withings: Withings status 401 ...
```
Não regrediu para 500, e o erro nasce dentro de `ingestWithings` — prova de que a rota passa pelo
módulo extraído. **Ressalva:** o caminho de *sucesso* não é executável de `localhost` (exige conta
Withings real contra URL pública HTTPS), o que já está declarado como fora de escopo na tarefa.

## Critérios de aceite

- [x] `userid` desconhecido → 200 e nada gravado
- [x] A mesma notificação duas vezes → uma linha
- [x] Nenhum dado de outro tenant é tocado
- [ ] Notificação válida grava a medida em segundos — **não executável localmente**; provada a
      metade nossa (resolve a conexão, chama `ingestWithings` com a janela notificada, grava com
      deduplicação)
- [ ] Inscrição criada ao conectar e removida ao desconectar — **não executada** (exige OAuth real);
      verificada por leitura de código

## Achados e o que foi feito depois

1. **Dois grpids diferentes no mesmo instante, para o mesmo paciente, perdiam um.** O `OR` casava
   por horário primeiro. **Corrigido:** o casamento por `measuredAt` passou a valer só para linhas
   com `withingsMeasureId: null` (as pré-T-9).
2. **`P2002` na corrida webhook × sync não era tratado.** **Corrigido:** tratado como duplicata, sem
   abortar o lote.
3. **Nenhum alerta saía por este caminho** (achado do code review, não do QA): uma leitura alta
   chegando pelo webhook não avisava a clínica. **Corrigido:** `lib/bp-alerts.ts` é chamado aqui
   também.

## Incidente

No meio da execução, a sessão principal rodou `git stash push -u` no worktree compartilhado e
removeu o código da 074 do disco. Foi restaurado com `stash apply` + `drop` e o dev server
reiniciado com o cache limpo. **Todos os cenários foram reexecutados depois** — os resultados acima
são os da segunda rodada.
