# Atividade 077 — Notificação push: o aviso geral e o aviso que é só seu

## Objetivo

Duas coisas que o Bruno pediu em 25/09, e que são o mesmo encanamento:

1. **O aviso geral.** Ele abre o painel, escreve ("a clínica não abre amanhã") e aquilo **chega no
   celular** de todo mundo que tem o app, sem ninguém precisar abrir nada.
2. **O aviso individual.** Quando a clínica faz algo **para um paciente** — responde uma mensagem,
   comenta o vídeo do exercício dele, confirma ou remarca a consulta, compartilha um documento —
   aquele paciente é avisado no celular.

Hoje nenhuma das duas acontece, e não é questão de configuração: **a peça não existe**.

## O que medi antes de planejar (25/09/2026)

| o que | estado real |
|---|---|
| `expo-notifications` no app | **não instalado** — o app nunca pede permissão nem registra aparelho |
| `PushDeviceToken` no banco | modelo existe, sem nenhum caminho que o alimente pelo app |
| `POST /api/push-token` | existe, mas só aceita **cookie de sessão**; não está em `MOBILE_API_PREFIXES`, então o bearer do app é redirecionado para `/login` |
| `lib/push-send.ts` | manda para `https://fcm.googleapis.com/fcm/send` — a **API legada do FCM, desligada pelo Google em junho/2024**. Mesmo com chave, responde erro |
| `FIREBASE_SERVER_KEY` | ausente no `.env` |
| tela "Notifications" do admin | manda **broadcast dentro do app** (`ClinicMessage`), não push. Funciona, e é tenant-scoped desde o incidente de 11/09 |

Ou seja: a tela que parece "mandar notificação" manda mensagem para a caixa do paciente. Quem não
abre o app não fica sabendo — que é exatamente o problema.

## A decisão de desenho — Expo Push, não FCM direto

O app é Expo, e a EAS **já guarda as credenciais** de push. O serviço da Expo
(`https://exp.host/--/api/v2/push/send`) cobre iPhone e Android numa chamada só, aceita lote de
100, devolve recibo por aparelho e avisa quando um token morreu (`DeviceNotRegistered`).

O caminho alternativo — FCM v1 mais APNs na mão — significa service account do Google, chave da
Apple carregada em outro lugar e dois códigos de envio. Para um app com um punhado de pacientes,
é custo sem retorno.

**O que isso exige de você:** uma chave APNs registrada na EAS, gerada na sua conta Apple. A EAS
faz isso sozinha (`eas credentials`), mas mexe na sua conta de desenvolvedor — então é sua a
palavra.

## A linha que separa isto da regra de 17/09

Você desligou as automações que falavam com o paciente sozinhas. **Esta atividade não as liga de
volta.** A diferença é quem apertou o botão:

| dispara push | não dispara push |
|---|---|
| a clínica mandou uma mensagem | lembrete diário de exercício |
| o terapeuta respondeu ao vídeo do exercício | cobrança de adesão |
| consulta marcada, confirmada, remarcada ou cancelada **pela clínica** | lembrete de medir pressão |
| documento ou plano compartilhado com o paciente | qualquer regra de automação |
| o aviso geral que **você** escreveu e enviou | broadcast agendado por regra |

Do lado esquerdo, alguém da clínica decidiu e agiu — o push só conta o que já foi feito. Do lado
direito, seria o robô falando, e isso continua desligado até você dizer o contrário.

## As outras regras que este recurso não pode quebrar

1. **Você vê antes.** No aviso geral: prévia com o texto exato e a contagem de aparelhos, e só
   então "enviar". Push não tem desfazer — o que chegou, chegou.
2. **Nunca atravessa tenant.** Só pacientes da clínica em que você está. Aluno de personal é outro
   produto e não recebe nada da BPR — foi o incidente de 11/09.
3. **Chegar é diferente de existir.** Todo push tem um par dentro do app (a mensagem, a resposta,
   a consulta). Quem estava com o celular desligado, sem permissão ou sem app encontra o aviso
   quando abrir. O push é o toque no ombro, não o conteúdo.
4. **O paciente pode desligar.** Sem isso, a única saída dele é desinstalar.

## Tarefas

| T-N | nome | status |
|-----|------|--------|
| T-1 | o app pede permissão e registra o aparelho | pendente |
| T-2 | a rota de registro aceita o bearer do app e guarda o token da Expo | pendente |
| T-3 | o envio: Expo Push em lotes, com recibo e token morto desativado | pendente |
| T-4 | painel: escrever o aviso geral, ver a prévia, saber quantos recebem, enviar | pendente |
| T-5 | o aviso individual: as cinco ações da clínica que tocam o ombro do paciente | pendente |
| T-6 | tocar na notificação abre a tela certa | pendente |
| T-7 | o paciente desliga no próprio app | pendente |

T-1 e T-2 são o par que faz um aparelho existir — sem eles nada mais tem efeito. T-3 é o envio, e
serve às duas metades. T-4 é a sua mão no botão; T-5 é a metade individual. T-6 e T-7 são o que
separa um recurso útil de um incômodo.

## O que decide se entra neste build ou no próximo

`expo-notifications` é **dependência nativa**: sem um build novo, nenhum aparelho registra, e o
recurso fica sendo código que nunca roda. Se entrar agora, vai junto com o ícone, o PDF e o
player — e o build sai mais tarde hoje. Se ficar para depois, custa outro build.

## Suposições — precisam do seu aval

1. **Quem recebe o aviso geral: pacientes da clínica ativa.** Equipe não recebe. "Selecionados"
   fica para depois — hoje é tudo ou nada, como a tela de broadcast já faz.
2. **Título e texto livres, sem template.** Aviso operacional é o caso de uso, não campanha.
3. **Sem agendamento.** O broadcast tem `scheduledFor`; aqui é enviar agora. Agendar push exige um
   cron confiável e tira de você a chance de cancelar.
4. **Permissão negada não vira insistência.** Uma vez recusada, o app não pergunta de novo —
   oferece abrir os Ajustes, como já faz para câmera e galeria.
5. **`lib/push-send.ts` é reescrito, não mantido.** Aponta para uma API desligada há mais de um
   ano; manter os dois caminhos seria manter um que não funciona.
6. **O texto do aviso individual não carrega conteúdo clínico.** "Sua terapeuta respondeu ao seu
   vídeo" e não o que ela escreveu — notificação aparece na tela bloqueada, à vista de qualquer um.
