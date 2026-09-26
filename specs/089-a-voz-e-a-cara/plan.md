# Atividade 089 — A voz e a cara

**Status:** plano escrito — **T-1 bloqueada numa decisão do Bruno** (provedor de vídeo)
**Data:** 26/09/2026

## Objetivo

> "Num agendamento de consulta, se o paciente escolher para fazer consulta por vídeo, o app nosso
> precisa ter essa opção de fazer videochamada. E nas mensagens também a gente tem que ter a opção
> de enviar mensagem de voz." — Bruno

## O que existe hoje, e o que é esqueleto

### A videochamada é um campo vazio

`Appointment.videoRoomId` e `Appointment.videoRoomUrl` existem no banco. A tela
`/admin/video-consultations` gera `/video-room/<id>` e manda abrir.

**Essa rota não existe.** Nunca existiu. Ninguém nunca entrou numa sala — o botão abre uma aba em
branco. O campo está lá desde alguma atividade antiga, o resto nunca foi construído.

### A voz não precisa de banco novo

`ClinicMessage` já tem `attachmentUrl`, `attachmentName` e `attachmentType`. Um áudio é um anexo
com tipo `audio/*` — a mensagem de voz viaja pelo caminho que já existe, com a autenticação que já
existe (`/api/files/[id]` com token assinado).

O que falta é pequeno: a validação aceita imagem, PDF, Word, TXT e CSV, e **recusa áudio**.

### O nativo já entrou no build 16

`expo-audio` instalado e declarado, com texto próprio de permissão do microfone — o do
`expo-image-picker` fala de gravar vídeo de exercício, que é outra pergunta ao usuário.

## Decisões de design

### 1. A sala de vídeo é hospedada, aberta no navegador de dentro do app

Um SDK nativo (Daily, LiveKit) dá controle fino — mudo, câmera, layout — e custa: dependência
pesada, `react-native-webrtc`, e **mais um build** sempre que ela mudar.

Uma sala hospedada aberta com `expo-web-browser` — que já está instalado — funciona hoje, sai por
`eas update`, e a câmera e o microfone já estão declarados. A troca é controle por velocidade, e
para a primeira publicação a velocidade vale mais.

Se um dia a experiência pedir o SDK, ele entra num build futuro sem jogar nada fora: o que muda é
como a sala abre, não como ela é criada.

### 2. A sala nasce com a consulta, não no momento de entrar

Criar na hora de entrar significa que a pessoa espera a rede antes de ver o terapeuta. Criada junto
da consulta em modo vídeo, o link já existe quando chega a hora.

### 3. O paciente entra quando faz sentido entrar

Uma sala aberta o dia todo é uma sala em que alguém entra às nove da manhã para uma consulta das
quatro. O botão aparece **perto do horário** — antes disso, diz quando vai abrir.

### 4. A voz é um anexo, não um tipo de mensagem novo

Tratá-la como tipo novo duplicaria envio, armazenamento, autenticação e listagem. Como anexo, ela
herda tudo isso pronto — e aparece nos Documentos do paciente como qualquer outro anexo de
conversa, que é onde os anexos de conversa já aparecem.

### 5. Gravar é segurar, não tocar

Um toque que começa a gravar e outro que para deixa gravação acidental rodando por minutos. Segurar
enquanto fala é o gesto que toda gente já conhece, e soltar termina.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | Provedor de vídeo: conta, chave e a sala | **decisão do Bruno** | **bloqueada** |
| T-2 | A sala nasce com a consulta em modo vídeo | T-1 | pendente |
| T-3 | O paciente entra pela consulta, na hora certa | T-2 | pendente |
| T-4 | Áudio passa a ser anexo aceito | — | pendente |
| T-5 | Gravar e enviar voz no app | T-4 | pendente |
| T-6 | Ouvir a voz — no app e no painel da clínica | T-5 | pendente |

## A decisão que bloqueia a T-1

| provedor | custo | o que pesa |
|---|---|---|
| **Daily.co** | grátis até 10.000 min/mês | API simples de criar sala; feito para isto |
| **Whereby Embed** | ~$10/mês + uso | o mais fácil de embutir; menos controle |
| **Jitsi** (público) | grátis | sala pública com nome adivinhável — **não serve para consulta clínica** |
| **Jitsi** (próprio) | servidor | controle total, e um servidor a mais para manter |

**Eu recomendo o Daily.** O nível grátis cobre muito mais do que uma clínica usa, a sala é criada
por API com prazo de validade, e não exige servidor novo.

Os termos publicados já preveem isto, no item 3: *"as consultas por vídeo/áudio são realizadas
através da nossa plataforma de videochamada, que processa os dados da chamada de acordo com seus
próprios termos de privacidade"*. Escolher o provedor é escolher de quem são esses termos — e por
isso é decisão sua, não minha.

## Suposições

1. **A sala expira.** Um link de consulta que funciona para sempre é um link que funciona para quem
   o encontrar depois.
2. **Ninguém grava a chamada.** Gravar consulta clínica é outra conversa — consentimento próprio,
   retenção, e um lugar para guardar.
3. **Voz no máximo 2 minutos.** Acima disso é conversa, e conversa é consulta.
4. **A voz aparece nos Documentos**, como todo anexo de conversa hoje. Se incomodar, o filtro é
   por `source: CHAT_UPLOAD` e é ajuste de tela, não de arquitetura.
5. **O terapeuta responde por texto.** Voz do lado da clínica é simétrico e fácil de acrescentar
   depois; começar pelo paciente é começar por quem tem dificuldade de digitar.
