# Atividade 108 — A clínica decide como recebe

## Objetivo

> O Bruno, 29/09/2026:
>
> *"Se o paciente está no aplicativo e resolve fazer um booking no horário, e
> depois ele não vai e não paga, aí é um problema, né? Então, quando a clínica
> conversa com o paciente por telefone, aí sim ela vai conseguir receber por
> transferência, ou até o paciente pode pagar em dinheiro, mas aí ela organiza
> tudo isso. É importante a gente ter essa flexibilidade. **É a clínica que
> decide**: se deixa liberado para agendar pagando, ou também sem pagar e pagar
> da forma que o paciente escolher, pessoalmente ou transferência bancária."*

## O que eu encontrei

As três regras existem e funcionam. O que falta é **onde decidir**.

| caminho | regra hoje | configurável? |
|---|---|---|
| Primeira consulta | paga no ato — o pagamento é o que confirma | **não**: `requiresPayment: true` fixo no código |
| Sessão do pacote | grátis, já foi paga na compra | não, e está certo |
| Sessão extra | segue `extraSessionPayment` (`AT_BOOKING` / `INVOICE`) | o campo existe e **nenhuma tela o escreve** |

E os formatos têm o mesmo problema, achado no mesmo dia: `consultationAllowsVideo`
e `consultationAllowsHomeVisit` só são alcançáveis por **SUPERADMIN**, numa
página de **gestão de clínicas da plataforma**. O Bruno procurou nos ajustes da
clínica e não achou — o lugar onde se procura não é o lugar onde está.

## O risco que ele nomeou, e que o sistema já cobre pela metade

*"Ele não vai e não paga"*. Hoje, com `INVOICE`, uma consulta marcada pelo app
nasce **confirmada** e ocupa o horário sem nada garantido. Se a pessoa não
aparece, restam a falta (103 T-2) e a fatura em aberto.

Com `AT_BOOKING` o horário só vale depois de pago: a consulta nasce `PENDING` e
**quem confirma é o webhook**. Quem fecha a folha do Stripe não prende o
horário.

As duas coisas coexistem, e é essa a flexibilidade pedida: o app cobra, e o
paciente que liga continua sendo marcado à mão com transferência ou dinheiro —
a 106 T-6, feita hoje.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [Onde a clínica decide](t-1-onde-a-clinica-decide.md) | pendente |
| T-2 | [A primeira consulta também é uma escolha](t-2-primeira-consulta-e-escolha.md) | pendente |
| T-3 | [O paciente sabe, antes de confirmar, se vai pagar agora](t-3-o-paciente-sabe-antes.md) | pendente |

**T-1 primeiro**: sem ela, as outras duas criam mais campos que ninguém alcança.

## Decisões de design

### Configuração sem tela não é configuração

Três campos desta clínica — vídeo, domicílio, pagamento da sessão extra — estão
no banco, são lidos pelas regras e **não têm onde ser escritos** por quem
administra a clínica. Na prática são constantes com passos extras.

### O padrão continua o de hoje

`INVOICE` para sessão extra e pagamento no ato para a primeira consulta.
Mudança de comportamento por deploy é o tipo de surpresa que se descobre no
extrato.

### Quem decide é ADMIN da clínica, não SUPERADMIN

O que a clínica oferece e como ela recebe é dela. SUPERADMIN continua podendo,
porque pode tudo — mas não é ele quem precisa.

## Suposições — para você validar

1. A primeira consulta ganha um campo próprio, e não herda o da sessão extra:
   são decisões diferentes (uma é paciente novo, a outra é paciente conhecido).
2. "Pagar pessoalmente" não vira um terceiro valor: é o mesmo `INVOICE` —
   marca agora, acerta depois — e o **como** entra na 106 T-6 quando o dinheiro
   chega.
3. Ninguém mexe no pacote: sessão comprada já está paga.
