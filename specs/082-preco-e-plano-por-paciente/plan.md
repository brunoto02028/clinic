# Atividade 082 — Preço e plano por paciente

**Status:** em andamento — aprovado em 26/09/2026
**Data:** 26/09/2026

## Objetivo

O Bruno pediu duas coisas na mesma frase: *"o que eu configurar na clinic apareça para os
pacientes, e a possibilidade de direcionar tudo para todos ou individualizar — um plano aparece
para aquele paciente específico, a primeira consulta para todos"*.

A pergunta por trás das duas é uma só: **para quem isto vale?** Hoje o sistema responde em três
lugares e falha em dois.

## O que já respondia, e o que não

| o quê | escopo hoje | estado |
|---|---|---|
| Preço de serviço (consulta, sessão, scan) | clínica toda | ✅ — o `£60` inventado que atrapalhava morreu em 26/09 |
| Pacote de sessões | por paciente | ✅ |
| Acesso livre (*Patient Access Override*) | por paciente | ✅ |
| **Plano de assinatura** | "todos" **ou** paciente específico | ⚠️ o servidor filtra certo; **o app da clínica não tem tela** |
| **Preço diferente para um paciente** | — | ❌ não existe |

`/api/patient/membership/plans` já devolve `patientScope: "all"` mais os
`patientScope: "specific"` deste paciente, e `subscribe` recusa plano que não foi oferecido a ele
(atividade 52, T-6). O consumidor dessa API (`fetchPlans`) existe só no módulo **BA** — o paciente
da clínica não tem onde ver nem assinar.

## Decisões de design

### 1. A exceção é uma linha própria, não uma coluna a mais

`ServicePrice` tem `@@unique([clinicId, serviceType])`. Pôr `patientId` ali obrigaria a trocar a
restrição — um `DROP INDEX` no banco de produção, que é exatamente o que o guard de migração
existe para impedir.

Então o preço do paciente é um modelo separado, `PatientServicePrice`. Além de ser aditivo, é mais
honesto: o preço da clínica e a exceção de uma pessoa são coisas diferentes, com histórias
diferentes — a exceção tem motivo, e o motivo fica gravado.

### 2. A ordem de resolução é uma só, escrita uma vez

```
preço do paciente  →  preço da clínica  →  preço padrão da plataforma  →  não precificado
```

Uma função (`servicePricesForPatient`) responde à tela, à marcação e ao que for. Duas
implementações da mesma pergunta seriam a tela prometendo um preço e o servidor cobrando outro —
que foi a N4 da 080.

### 3. O paciente nunca sabe que é exceção

A tela dele mostra o preço, e só. Nada de "desconto especial" nem de preço riscado: o que ele
paga é um número, não uma negociação exibida.

### 4. Plano no app é leitura e assinatura, não gestão

A tela da clínica mostra os planos oferecidos a **este** paciente, o que cada um inclui, e o botão
de assinar — que reaproveita o `subscribe` existente (grátis ativa na hora; pago abre o Checkout).
Cancelar também, porque uma assinatura que só a clínica cancela é uma armadilha.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | Preço por paciente: modelo, resolução e API | — | em andamento |
| T-2 | Preço por paciente no painel da clínica | T-1 | pendente |
| T-3 | Planos no app do paciente da clínica | — | pendente |

## Suposições

1. **Uma exceção por paciente e serviço.** `@@unique([patientId, serviceType])` — mudar o preço
   substitui, não empilha.
2. **A exceção vale enquanto existir.** Sem data de validade nesta atividade; apagar a linha
   devolve o paciente ao preço da clínica.
3. ~~**Quem define é o dono.**~~ **RESOLVIDO em 26/09/2026:** só SUPERADMIN. A tela que abre a
   janela já era superadmin-only, e a rota prometia ADMIN — a rota foi alinhada à tela.
4. **Zero é um preço válido** — cortesia registrada, diferente de "não precificado" (`null`).
5. **A assinatura paga continua exigindo `stripePriceId`.** Plano pago sem ele é recusado, como
   já é hoje (atividade 52, T-6) — nada de ativar de graça por engano.

## Fora do escopo

- Validade/expiração da exceção de preço.
- Desconto percentual (o `sessionDiscount` do plano já faz isso por outro caminho).
- Preço por paciente nos exames de laboratório (081) — lá o preço é do catálogo.
