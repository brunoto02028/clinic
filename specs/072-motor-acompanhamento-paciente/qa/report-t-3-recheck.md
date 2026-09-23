# QA (reverificação) — T-3: `AutomationRule`, após as correções dos 6 achados

**Data:** 23/09/2026 · **Branch:** `brunoto02028/motor_acompanhamento` · **Commit:** `5c7c352a`
**Referência:** `report-t-3.md` (commit `c41c6c91`)
**Resultado: APROVADO**

> Os seis achados estão corrigidos, e os três piores foram testados além do que o relatório
> original mediu: **F1 com 360 chamadas concorrentes em seis estados do heap**, **F3 com 8.064
> instantes em sete fusos** incluindo as duas viradas de BST, **F2 com o hash do e-mail comparado
> ao da versão pré-migração**. Nada do que passava regrediu: dos 26 casos adversariais, 24 têm
> resultado idêntico e os 2 que mudaram são exatamente os do F6.

## Resumo

| # | Item | Antes | Agora |
|---|---|---|---|
| 0 | `migrate diff` sem `DROP` (commit a commit) | ✅ | ✅ |
| 3.1 | Saída idêntica à de antes da migração | ✅ | ✅ |
| 3.2 | Limite na tabela muda comportamento | ✅ | ✅ matriz idêntica linha a linha |
| 3.3 | Regra por clínica, valor e `active` | ✅ | ✅ |
| 3.4 | `evaluateCondition` | ✅ | ✅ 17/17 + 26 adversariais |
| 3.5 | `Alert` LOW sem mensagem | ✅ | ✅ |
| 3.6 | Outras 12 rotas de cron | ✅ | ✅ |
| **F1** | Dupla regra global | ❌ trocava sozinha | ✅ **unânime em 360 chamadas paralelas** |
| **F2** | Texto da regra chega ao paciente | ❌ campo morto | ✅ **campo removido** |
| **F3** | Janela do dedupe | ⚠️ um dia atrasada | ✅ **0 erros em 7 fusos** |
| **F4** | Título × limite | ⚠️ mentia | ✅ interpolado |
| **F5** | `titlePt` morto | ⚠️ | ✅ removido |
| **F6** | `ne`/`nin` com fato ausente | ⚠️ falhava aberto | ✅ falha fechado |

## 3.1 — o texto que chega ao paciente não se mexeu ✅

O A/B foi refeito inteiro, porque o caminho do envio mudou ao tirar o `actionText`. Versão
pré-migração executada de verdade, com `fetch` interceptado e bloqueado fora de `localhost`:

| | ANTES (`c41c6c91~1`) | AGORA (`5c7c352a`) |
|---|---|---|
| destinatário, assunto, `AuditLog` | — | idênticos |
| `remindersSent` | 1 | 1 |
| `sha256(html)` | `2add20ef…d6d7565e` | **`2add20ef…d6d7565e`** |

O hash é o mesmo de antes de qualquer correção — que é o que tinha de acontecer, já que o texto
nunca vinha da regra. `OUTBOUND-SINK` = 11, `Sent via Resend` = **0**, `[FETCH-OUT]` = **0**.

## F1 — sob concorrência ✅

60 chamadas simultâneas por estado (30 `loadRule` + 30 `loadRules` intercaladas), com **duas
globais duplicadas mais uma regra da clínica**, mexendo no heap com `UPDATE` em cada linha:

```
[2 globais + regra da clinica]   UNANIME: SIM -> DA-CLINICA
[UPDATE na global original]      UNANIME: SIM -> DA-CLINICA
[UPDATE na regra da clinica]     UNANIME: SIM -> DA-CLINICA
[UPDATE na duplicata]            UNANIME: SIM -> DA-CLINICA
[so as 2 globais]                UNANIME: SIM -> a mais antiga
[so as 2 globais, heap mexido]   UNANIME: SIM -> a mais antiga
```

Seis estados, 360 chamadas, **uma escolha só em cada**. A armadilha do `NULLS FIRST` não morde: a
regra da clínica ganhou das duas globais nos quatro estados em que existia.

No nível HTTP, 6 `POST` simultâneos com a duplicata no banco: 6× 200, `alertsRaised` `2 0 0 0 0 0`,
2 alertas gravados, **0 vindos da duplicata**.

## F3 — na virada do dia, em sete fusos ✅

1.152 instantes por fuso, em três janelas de 4 dias (setembro, fim e início do BST):

```
Europe/London      NOVO: 0 erros   ANTIGO:  772
Asia/Tokyo         NOVO: 0 erros   ANTIGO: 1152
Pacific/Kiritimati NOVO: 0 erros   ANTIGO: 1152
UTC, NY, Midway, São Paulo — NOVO e ANTIGO: 0
dias locais com >1 rotulo: 0   |   rotulos compartilhados por 2+ dias: 0
```

As duas garantias pedidas. O padrão confirma a causa: a expressão antiga errava em todo fuso a
leste de UTC.

## F6 — sem quebrar o que passava ✅

17/17 no jest. Os 26 casos adversariais reaplicados sem mudar uma linha:

```
divergencias vs o resultado anterior: 2
  fato AUSENTE com ne  : true -> false
  fato AUSENTE com nin : true -> false
```

Os outros 24 idênticos. A mudança atingiu só o que devia.

## Resíduos apontados, e o que foi feito

| # | Resíduo | Destino |
|---|---|---|
| **R1** | `actionData.useReminderTemplate` era a última cópia do padrão do F2 — a rota passa o literal, e pôr `false` na linha não mudava nada | **Removido do seed.** `actionData` do lembrete é `{}` |
| **R2** | `{ toString: { ne: "x" } }` com `facts = {}` ainda respondia `true`: `facts["toString"]` herda de `Object.prototype` | **Corrigido** com `Object.hasOwn`. Verificado: `toString` e `valueOf` → `false`; `ne` com fato presente segue `true` |
| **R3** | Placeholder inexistente chega cru ao título que o terapeuta lê | **Virou critério de aceite da T-6**, que é quem abre o formulário |

## Notas de ambiente

- **Árvore com T-4 não commitado** durante a reverificação: o cenário zero foi refeito commit a
  commit para não contaminar a medição. Os quatro arquivos da T-3 estão idênticos ao `HEAD`, e nem
  a rota nem o `rules.ts` importam qualquer coisa da T-4.
- **O 500 no log é anterior à sessão** — `P2021` de quando o outro worktree derrubou `alerts`.
  Depois disso: **38 chamadas à rota, 38 respostas 200**. Fica o registro de que, com a tabela
  ausente, a rota devolve 500 em vez de degradar.
- Nesta rodada o banco compartilhado não derrubou nada.

**T-3 aprovada.**
