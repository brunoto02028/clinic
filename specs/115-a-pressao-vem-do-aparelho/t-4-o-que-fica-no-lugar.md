# T-4: O que fica no lugar do cartão

**Status:** pendente
**Depende de:** T-1 — e **da atividade 114**

## Objetivo

Responder, na tela da clínica, a pergunta que o cartão respondia errado: **como é
que a pressão deste paciente chega aqui?**

## Contexto

Tirar o cartão sem pôr nada deixa a clínica sem saber por onde a leitura entra —
e é aí que alguém passa a digitar tudo à mão para sempre, ou desiste.

Os caminhos reais, hoje:

| caminho | como chega |
|---|---|
| **aparelho por API** (medidor, relógio, anel) | `wearables/callback` e `cron/wearables-sync` → `CLINIC_DEVICE`. Hoje só a Withings está ligada; os outros seis provedores estão com `enabled: false` |
| **caixa de medições não atribuídas** | o aparelho tem **um perfil só**, então a leitura chega sem dono e é atribuída ao paciente certo |
| **digitação pelo terapeuta** | a aba de pressão da ficha (069) |
| **digitação pelo paciente** | o formulário do app |

O segundo é o que mais precisa de estar à vista: é o que a clínica usa todos os
dias, e é o menos óbvio dos quatro.

## A dependência, que é dura

Esta tarefa **não sai sozinha**. A atividade 114 investiga por que a Withings não
está a trazer dado. Apontar a clínica para um caminho que não entrega seria pior
do que o cartão errado — seria trocar uma promessa falsa por outra.

## Passos

1. No lugar do cartão, dizer de onde vêm as leituras, com o caminho para a caixa
   de medições e para a ficha. **Nomear o caminho, e não um fornecedor** — o
   plano é ligar vários, e a tela não deve precisar de edição a cada um.
2. Nas duas línguas. A tela já tem `useLocale`, e hoje está meio traduzida — o
   título em português e o corpo em inglês. Isso entra junto.

## Arquivos afetados

- `app/admin/blood-pressure/page.tsx`
- `lib/i18n.ts`

## Critérios de aceite

- [ ] A tela diz por onde a leitura entra, sem prometer medição por telefone
- [ ] Os caminhos levam a lugares que funcionam
- [ ] EN e PT, inglês primeiro
- [ ] Sai junto com a 114
