# QA (reverificação 2) — T-6: Painel de regras

**Data:** 23/09/2026 · **Commit:** `d8aafe90`
**Resultado: APROVADO**

| # | Item | Antes | Agora |
|---|---|---|---|
| — | `npx jest __tests__/automation` | 25 | ✅ **29/29** |
| N1a | `__proto__` / `constructor` / `prototype` | 200 ❌ | ✅ 400 |
| N1b | `condition: {}` pelo PATCH | 200 ❌ | ✅ 400 |
| N1c | Regra semeada com `{}` continua "sempre" | — | ✅ |
| N2 | PATCH parcial de `actionData` | apagava ❌ | ✅ merge |
| G3 | Contraste nas três telas | 6–8 falhas | ✅ só `.section-tab` |

## N1 — a porta do PATCH está fechada

```
__proto__    -> 400  "A condition with no rules in it would fire for every patient"
constructor  -> 400  "A condition cannot use __proto__, constructor, prototype as a key"
prototype    -> 400  idem
condition {} -> 400
controle (condicao valida) -> 200, gravada como {"missingItems":{"gte":2}}
```

**N1c — o corte está certo:** com `condition: {}` escrito **direto no banco** (o caminho de um
seed), `evaluateCondition({}, …)` segue `true` e o cron dispara normalmente. O motor não mudou; só
a porta do formulário foi fechada.

## N2 — merge de verdade

```
PATCH {"priority":"HIGH"}  -> titleEn preservado
PATCH {"titleEn":"..."}    -> priority preservado
```

Consequência do merge, não defeito: pela API já não dá para **remover** uma chave — só sobrescrever
ou voltar ao padrão com o `DELETE`.

## G3 — contraste, passada final

| Tela | Medidos | Reprovados | Só `.section-tab`? |
|---|---|---|---|
| `/admin/automation` | 32 | 4 | sim |
| `/admin/outbox` | 22 | 4 | sim |
| `/admin/alerts` | 16 | 4 | sim |

```
badge "This clinic"        5.32:1  (era 3.04:1)
"Back to the default"     12.73:1  (era 3.04:1)
filtros                   14.61:1  (eram 3.49:1)
aviso ambar do terapeuta  11.13:1
h2 das tres telas         14.61:1
```

## Observação sem impacto

Quem barra o `__proto__` sozinho é a checagem de "condição vazia", não a `FORBIDDEN_KEYS`: ele não
aparece em `Object.keys()` depois do parse. Quando vem junto de uma chave válida, é descartado em
silêncio e o limiar real é preservado (`{"missingItems":{"gte":2},"__proto__":{...}}` → grava só o
primeiro). O resultado é seguro nos dois casos; só a mensagem específica do `__proto__` nunca
aparece.
