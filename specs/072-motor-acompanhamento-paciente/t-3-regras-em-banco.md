# T-3: `AutomationRule` — regras em banco, uma automação migrada

**Status:** pendente
**Depende de:** T-1

## Objetivo

Tirar os limites e os textos de dentro do código e colocá-los numa tabela de regras, provando o
conceito com **uma** automação: o lembrete diário de aderência.

## Contexto

Documento §3.1 e §3.2. Hoje cada automação é código separado em `app/api/cron/*` — mudar um limite
exige deploy. A atividade 061 já deu o primeiro passo: um gate por clínica no `daily-adherence`,
com toggle self-service no admin. Esta tarefa generaliza esse gate para uma regra com condição e
ação declaradas.

Migra **uma só** automação. As outras 12 rotas de cron continuam exatamente como estão — mexer em
todas de uma vez é a forma mais rápida de quebrar o que está no ar.

## Passos

1. Modelo `AutomationRule`: `code` único, `clinicId` (nulo = padrão global), `name`, `active`,
   `trigger`, `eventName`, `condition Json`, `action`, `actionData Json`, `channels`.
2. `lib/automation/rules.ts`: `loadRule(code, clinicId)` com fallback para a regra global, e
   `evaluateCondition(condition, facts)` — função pura, com testes unitários.
3. Seed da primeira regra: `ADHERENCE_DAILY_REMINDER`, com a condição e o texto que o
   `daily-adherence` usa hoje, **sem mudar comportamento**.
4. `app/api/cron/daily-adherence/route.ts` passa a ler limite e template da regra em vez das
   constantes. O toggle por clínica da ativ. 061 continua valendo e vira o campo `active`.
5. Primeira regra que gera alerta (usa T-2): aderência abaixo do limite → `Alert` de prioridade
   `LOW`, em vez de mensagem direta.

## Arquivos afetados

- `prisma/schema.prisma` (só adição)
- `lib/automation/rules.ts`, `lib/automation/rules.test.ts` (novos)
- `app/api/cron/daily-adherence/route.ts` (passa a ler da tabela)
- `prisma/seed-automation-rules.ts` (novo)

## Critérios de aceite

- [ ] `prisma migrate diff` **não contém `DROP`**
- [ ] Com a regra seedada, o `daily-adherence` produz **exatamente** o mesmo resultado de hoje
      (comparar saída antes e depois, com os mesmos dados)
- [ ] Mudar o limite na tabela muda o comportamento **sem deploy**
- [ ] `active: false` desliga a regra para aquela clínica e não afeta as outras
- [ ] `evaluateCondition` tem teste para cada operador suportado
- [ ] As outras 12 rotas de cron não foram tocadas (diff limpo fora do `daily-adherence`)
