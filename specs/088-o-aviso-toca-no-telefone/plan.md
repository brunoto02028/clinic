# Atividade 088 — O aviso toca no telefone

**Status:** T-2 concluída · T-1 escrita, esperando o dia do build
**Data:** 26/09/2026

## Objetivo

> "Eu mandei aqui outro lembrete, mas só chegou no e-mail. Não chegou no app do paciente Bruno, que
> é o que está funcionando." — Bruno

## O diagnóstico: eram dois motivos, não um

### 1. O lembrete nunca tentou mandar push

Não era falha de entrega — o código não tinha essa linha. Push existia em **dois** lugares no
sistema inteiro: a mensagem em massa e a resposta do terapeuta ao vídeo. O lembrete de aderência
era e-mail e nada mais.

### 2. E se tentasse, não chegaria

O `app.json` não declarava a permissão de push do iOS. O app **sempre teve** o código que pede o
token; sem `aps-environment` no build, a chamada estoura no aparelho, o `catch` a engole, e nenhum
telefone fica registrado.

Zero `PushDeviceToken` no banco. Não era o envio que falhava: era o registro que nunca acontecia.

## Decisões de design

### O push sai **junto** do e-mail, nunca no lugar dele

O e-mail é o que fica e o que a pessoa acha depois; o push é o que faz olhar agora. Tratar push
como canal alternativo trocaria a mensagem que permanece pela que some.

Por isso ele entrou em `notifyPatient`, que é o funil de todo aviso ao paciente — e não no lembrete
de aderência sozinho. Todo envio futuro ganha junto.

### Um push que falha não pode derrubar o e-mail

`void ... .catch(() => {})`. A mensagem que importa é a do e-mail; o push é o extra. Deixar o extra
derrubar o principal seria trocar o certo pelo opcional.

### O build fica para o dia do build

Declarar push muda o fingerprint:

```
antes:  5787c66f…   ← o build 15, no telefone do Bruno
depois: a7210cf2…
```

No minuto em que entrar, o build 15 **para de receber `eas update`**. O Bruno testa por update, e
congelar o canal para ligar algo que só funciona depois de um build seria pagar antes de receber.

**Decisão dele, 26/09/2026:** segurar até o dia do build.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | O build que deixa o push chegar | autorização + Bruno no provisioning | **escrita**, esperando |
| T-2 | O push junto do canal, em `notifyPatient` | — | **concluída** |

## Suposições

1. **O título do push é "BPR" nas duas línguas.** O nome da clínica é o mesmo; o corpo é que muda.
2. **O toque leva aos exercícios** quando ninguém diz outra coisa — é o destino do único aviso que
   existe hoje. Cada chamada pode passar o seu.
3. **160 caracteres no corpo.** Mais que isso o sistema corta sem avisar, e é melhor a frase acabar
   onde nós escolhemos.
4. **O push vem ligado por padrão** em `notifyPatient`. Quem tem o app instalado e o aviso ligado
   está dizendo que quer ser avisado; quem não quer desliga no perfil, e `pushEnabled` já é
   respeitado pelo envio.
5. **Nada disso muda a regra de nunca enviar sozinho.** O lembrete continua saindo por botão
   manual — o push acompanha aquele envio, não cria um novo.
