# T-5: O aviso individual - as acoes da clinica que tocam o ombro

**Status:** pendente
**Depende de:** T-3

## Objetivo
Quando alguem da clinica faz algo **para um paciente**, aquele paciente e avisado no celular.

## Contexto
Isto **nao** liga de volta as automacoes desligadas em 17/09. Todo gatilho aqui e uma acao que uma
pessoa da clinica ja decidiu e executou; o push so conta o que ja foi feito.

Dispara:

| acao | texto (sem conteudo clinico) |
|---|---|
| mensagem da clinica para o paciente | "Nova mensagem da sua clinica" |
| terapeuta respondeu ao video do exercicio (076 T-5) | "Sua terapeuta respondeu ao seu video" |
| consulta marcada/confirmada/remarcada/cancelada pela clinica | "Sua consulta foi remarcada" |
| documento ou plano compartilhado | "Um novo documento esta no seu app" |

Nao dispara: lembrete de exercicio, cobranca de adesao, lembrete de pressao, regra de automacao.

## Passos
1. `lib/notify-patient.ts` ganha a perna de push, ao lado do que ja faz.
2. Ligar nos quatro pontos acima - **so** neles, e com comentario dizendo por que ali e nao no cron.
3. Texto neutro, com deep link (T-6) para a tela do assunto.
4. Respeitar o desligamento do paciente (T-7).

## Arquivos afetados
- `lib/notify-patient.ts`, rotas de mensagem da clinica, `app/api/admin/exercise-submissions/[id]/review/route.ts`, rotas de consulta e de documento

## Criterios de aceite
- [ ] Cada um dos quatro gatilhos chega no aparelho certo, e so nele
- [ ] Nenhum cron passou a mandar push
- [ ] Nenhum texto de notificacao contem dado clinico
- [ ] Paciente sem aparelho registrado: a acao acontece normalmente, sem erro
