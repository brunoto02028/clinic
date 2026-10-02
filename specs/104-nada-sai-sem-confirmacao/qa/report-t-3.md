# QA — T-3: Defaults invertidos e o rótulo que mente

**Veredito:** ⚠️ **reprovou de primeira** · ✅ aprovado após correção
**Data:** 02/10/2026 · **Método:** teste + mutação.

## O que a mutação achou

Devolver `notify = true` em `app/api/admin/broadcasts/route.ts` —
restaurando exatamente o defeito que a tarefa conserta — **não derrubava um
único teste**.

A rota mais sensível do painel, a mesma que já teve vazamento entre
inquilinos em 11/09/2026, e que manda para **todos os pacientes do
inquilino**, não tinha nenhum teste de envio. O conserto estava certo e
invisível: qualquer pessoa poderia desfazê-lo sem a suíte reclamar.

**Correção:** `__tests__/notifications/o-aviso-em-massa-nao-sai-por-omissao.test.ts`,
8 testes. Depois dele a mesma mutação derruba **4**.

## Cenários

| # | cenário | resultado |
|---|---|---|
| 13 | `POST /broadcasts` sem `notify` → grava o aviso, **nada sai** | ✅ |
| 14 | com `notify: true` → manda, um por paciente | ✅ |
| 15 | `appointments` com `sendConfirmation: false` e pagamento online | ✅ (já era, feito por outra sessão) |
| 16 | `appointments` sem `sendConfirmation` → não manda | ✅ |
| 17 | `email-test` com `patientId` → **não** escreve ao paciente | ✅ |
| 18 | rótulos: nada diz "simular" para algo que sai | ⚠️ não verificável sem tela |

## Mutação

| mutação | antes | depois |
|---|---|---|
| `broadcasts` volta a `notify = true` | **0 caem** | **4 caem** |
| `email-test` volta a `patient?.email \|\| session.user.email` | 1 cai | 1 cai |

## O que este QA não cobre

1. **Os rótulos na tela** (cenário 18). O botão ainda pode dizer "simular".
2. **A caixa do broadcast na UI** — se ela passou a nascer desmarcada, não
   foi visto.
3. **Nada em produção**, e nenhuma contagem em banco real.
