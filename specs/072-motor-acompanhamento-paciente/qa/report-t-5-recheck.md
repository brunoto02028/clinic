# QA (reverificação) — T-5: `AutomationRun`

**Data:** 23/09/2026 · **Commit:** `17a6a58a` (correções em `03b864df`)
**Resultado: APROVADO**

Os seis achados corrigidos e verificados um a um. O 5.4, que reprovou a tarefa, passa pela
navegação real — e os dois estados que não tinham sido exercitados (vazio × falha) foram executados.

| # | Achado | Antes | Agora |
|---|---|---|---|
| 5.4 | Histórico na ficha do paciente | ❌ | **✅** |
| E3 | Aba: vazio × falha | ⚠️ | ✅ |
| F1 | Aba inalcançável | ❌ | ✅ |
| F2 | Alerta com números velhos | ❌ | ✅ |
| F3 | Linha presa em `RUNNING` | ❌ | ✅ |
| F4 · F5 · F6 | chave, role, erro mascarado | 🟢 | ✅ |

## 5.4 — pela navegação real

```
hrefNaCentralDeAlertas: "/admin/patients/<id>"
urlFinal:               "/admin/patients/<id>"
redirects:              []            <- nenhum 307
abaAutomationExiste:    true
```

Conteúdo: `ADHERENCE_DAILY_ALERT · ALERT_RAISED · 23 Sept · Window: 2026-09-23 · missingItems: 2`.

**Vazio × falha:** "No rule has run for this patient yet." contra "We could not load the history." +
"This does not mean nothing ran — the request failed." + botão.

## F2 — o alerta acompanha os fatos

```
1o    -> created            | "1 activities missed today" OPEN LOW
piora -> refreshed=true     | "3 activities missed today" OPEN LOW   (1 linha so)
repeticao identica          | updatedAt mudou? false
resolvido + refresh         | texto atualiza, status segue RESOLVED (nao reabre)
escalada LOW->HIGH          | reabre, resolvedAt=null
```

## F3 — `STALE_RUN_MS = 15 min`

```
RUNNING de 2 horas:    ran=true  | DONE attempts=2
RUNNING de 5 minutos:  ran=false | reason=in-progress
6 retomadas simultaneas de linha velha: ran=1 efeitos=1
```

## F4 · F5 · F6

```
F4  patientId "all", "-", "p:all" — nenhum colide com a chave de clinica
F5  id de staff -> 404 | paciente de outra clinica -> 404 | da propria -> 200
F6  update do catch forcado a falhar -> quem sobe e a excecao ORIGINAL
```

## Observação nova (baixa)

Um alerta **já resolvido** tem título e `details` reescritos pelo refresh: o terapeuta resolveu
"1 activities missed today" e a linha passou a ler "4 activities missed today", ainda `RESOLVED`.
O status é preservado. Se a intenção for que o registro do que foi resolvido seja imutável, vale
não refrescar quando `status !== OPEN`. **Decisão de produto, levada ao Bruno.**
