# QA — T-5: O upsell automático e o e-mail sem marca

**Veredito:** ✅ aprovado
**Data:** 02/10/2026 · **Método:** teste + mutação + grep.

## Cenários

| # | cenário | resultado |
|---|---|---|
| 27 | concluir tratamento, medindo 30s: nenhum `MEMBERSHIP_OFFER` | ✅ |
| 28 | grep: nenhum `setTimeout` em volta de envio ao paciente | ✅ |
| 29 | o e-mail da avaliação corporal tem logo e usa o template | ✅ por leitura |
| 30 | nenhuma rota monta e-mail de paciente com HTML inline | ✅ |

O cenário 27 media 30 segundos de propósito: o defeito disparava em 5s,
**depois** de a rota responder. Medir logo após a chamada deixaria passar.
Como o `setTimeout` deixou de existir, hoje a janela é irrelevante — mas a
asserção fica, para o dia em que alguém reintroduzir o padrão.

## Mutação

| mutação | testes que caem |
|---|---|
| `TREATMENT_COMPLETED` volta a sair sem passar pelo portão | **6** |

## O que mudou, em uma frase cada

- **A venda saiu do handler.** Concluir um tratamento disparava uma oferta
  de plano cinco segundos depois. O atraso existia para os dois e-mails não
  chegarem colados — foi desenhado para a oferta parecer espontânea.
- **O relatório ganhou a marca.** Era o único e-mail ao paciente montado
  inline: sem logo, com assinatura em texto solto no lugar do rodapé, num
  roxo que não é do produto.

## O que este QA não cobre

1. **O e-mail renderizado.** Que `wrapInLayout` produz a logo certa para
   este inquilino foi lido, não visto. Ninguém abriu a mensagem.
2. **Para onde vai a oferta de plano.** A T-8 decidiu "botão dele", e esse
   botão **não existe** — hoje a oferta simplesmente não é enviável a não
   ser pelo compositor de e-mail.
3. Nada em produção.
