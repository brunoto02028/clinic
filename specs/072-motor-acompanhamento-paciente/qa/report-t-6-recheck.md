# QA (reverificação) — T-6: Painel de regras

**Data:** 23/09/2026 · **Commit:** `17a6a58a`
**Resultado: APROVADO COM RESSALVAS** — dois achados novos, corrigidos em `d8aafe90`
(ver `report-t-6-recheck-2.md`)

| # | Achado | Antes | Agora |
|---|---|---|---|
| **G1** | `priority` livre derruba o cron | ❌ | **✅ fechado nas três camadas** |
| **G2** | Edição descartada | ❌ | **✅** |
| **G3** | Contraste | ❌ | **✅** menos `.section-tab` (global) |
| G4 · G5 · G7 · G8 · G9 | — | 🟠/🟡 | ✅ |
| N1 | `__proto__` esvazia a `condition` | — | ❌ **novo** |
| N2 | `actionData` parcial apaga o resto | — | 🟠 **novo** |

## G1 — fechado nas três camadas

```
API:   priority invalida -> 400 "Expected 'LOW'|'MEDIUM'|'HIGH'|'URGENT'"
Tela:  <select> com exatamente os quatro valores, zero texto livre
Laco:  regra quebrada INJETADA NO BANCO (para nao depender da API)
       -> HTTP 200, a clinica sa levantou seu alerta,
          a quebrada voltou nomeada em "failures"
```

Era 500; agora a clínica sã roda. **Ressalva:** `failures[].error` devolve a mensagem inteira do
Prisma, que inclui `patientId`, `clinicId` e os nomes dos exercícios — e vai também para o
`console.error` e daí para o log de produção.

## G2 — a edição sobrevive

```
determinístico: editar B, salvar A -> a edicao de B continua la
corrida:        clique aos 1189ms entre dois loads (979, 1316) -> o clique sobreviveu
```

## G3 — contraste

| Elemento | Antes | Agora |
|---|---|---|
| `h2` das três telas | 14.61:1 | **14.61:1** ✅ |
| Badge "This clinic" | 3.04:1 | **5.32:1** ✅ |
| Botões e filtros | 3.04–3.49:1 | **5.32:1** ✅ |
| Aviso âmbar do terapeuta | não medido | **11.13:1** ✅ |
| `.section-tab` | 3.81:1 | **3.81:1** ❌ *(estilo global de `/admin`, fora do escopo)* |

De 6–8 reprovações por tela para **4, todas `.section-tab`**.

## N1 — `__proto__` transforma um limiar em "dispara para todos" ❌

```
regra:                   {"missingItems":{"gte":3}}  source: global
PATCH {"condition":{"__proto__":{"gte":1}}}  -> 200
condition apos o PATCH:  {}                  source: clinic
cron -> alertsRaised 1 | ALERT "2 activities missed today"  (limiar era 3)
```

A chave some na serialização e o que fica é `{}` — que o motor documenta como **sempre verdadeiro**.
O painel passa a mostrar a seção *Fires when* vazia.

## N2 — `actionData` parcial apaga as outras chaves 🟠

```
antes:  {"titleEn":"...","priority":"LOW"}
PATCH   {"actionData":{"auditAction":"X"}} -> 200
depois: {"auditAction":"X"}      <- titleEn e priority sumiram
```

## Observação sobre G8

A lista `EDITABLE` esconde o `auditAction` na tela, mas o schema ainda o aceita e **nada o lê** — o
cron passa a constante. Duplicação de fonte de verdade; vale tirar do seed.
