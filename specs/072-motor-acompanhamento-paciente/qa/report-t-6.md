# QA — T-6: Painel de regras

**Data:** 23/09/2026 · **Commit:** `13487de9` (T-6 em `3edc051e`)
**Resultado: REPROVADO** (corrigido; ver `report-t-6-recheck.md`)

> O núcleo funciona: mudar um limite pela tela muda o comportamento do cron sem deploy, e o
> override de uma clínica não toca nas outras. Reprova por três motivos independentes.

| # | Cenário | Resultado |
|---|---|---|
| 6.1 | Mudar limite **pela tela** muda o comportamento | ✅ |
| 6.2 | Desligar numa clínica não afeta as outras | ✅ |
| 6.3 | Prévia do template, inglês primeiro | ⚠️ sem objeto (não há PT) |
| 6.4 | `condition` inválida → 400 | ⚠️ 15/16 |
| 6.5 | Sem permissão → 403 e fora do menu | ✅ |
| 6.6 | `AuditLog` antes/depois | ✅ |
| E1 | Bateria de Zod (22 casos) | ⚠️ 4 furos |
| E3 | Contraste | ❌ **G3** |
| E4 | Usabilidade | ❌ **G2, G4** |

## O que passou

```
6.1  limite 3 -> 2 pela tela | cron: alertsRaised 1 | sem deploy, sem restart
6.2  override active:false na clinica A -> A silencia, a outra segue disparando
6.5  terapeuta: GET 200 canEdit:false | PATCH/DELETE 403 | inputs disabled | aba fora do menu
6.6  before: null -> after: {active, condition, actionData}; DELETE grava o inverso
```

## G1 — um admin derruba o cron digitando na tela 🔴

```
PATCH {"actionData":{"priority":"SUPER_URGENTE"}}  -> 200 OK
POST  /api/cron/daily-adherence                    -> HTTP 500
log: Invalid value for argument `priority`. Expected AlertPriority.
```

Três causas somadas: o campo é texto livre na tela; a API aceita qualquer string; e **o laço de
clínicas não tem `try/catch`**, então a primeira que falha aborta as seguintes — o erro de
configuração de um tenant impede o motor de rodar para todos os outros, e quem é atingido depende
da ordem do `findMany`.

## G2 — a tela descarta edição não salva 🟠

```
{"lembreteAntes":"1","lembreteEditado":"5","lembreteAposSalvarOAlerta":"1"}
```

`load()` sobrescreve o `draft` inteiro e `save()` chama `load()`. Editar a regra A e salvar a B
apaga a edição de A. A mesma causa produz corrida na carga (dois `GET` em voo).

## G3 — contraste abaixo de AA 🟠

Os `h2` estão em 14.61:1, mas badges, botões e sub-abas não:

| Elemento | Contraste |
|---|---|
| Badge "This clinic", botões fantasma | **3.04:1** |
| Filtros do outbox / alerts | **3.49:1** |
| Sub-abas inativas (`.section-tab`) | **3.81:1** |

Duas causas: o verde da marca `#4F7361` como **cor de texto** no escuro nunca chega a 4.5:1; e as
sub-abas usam opacidade 0.45.

## G4 a G9

- **G4:** salvar sem mudar nada **cria override** — desliga a clínica do padrão global para sempre.
- **G5:** `actionData` de 300 KB aceito; valor aninhado aceito e depois invisível na tela.
- **G6:** não há campo nem prévia em português (a regra só tem `titleEn`).
- **G7:** a prévia é fixa em "3 missing activities" e é aplicada a `priority`, gerando
  `On a patient with 3 missing activities: "LOW"`.
- **G8:** aviso para a T-7 — o `auditAction` apareceria como campo editável.
- **G9:** `AuditLog.userEmail` grava string vazia.
