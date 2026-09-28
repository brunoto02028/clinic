# T-5: O paciente escolhe o profissional, no app

**Status:** concluída (28/09/2026)
**Depende de:** T-3, T-4

## Objetivo

> *"O paciente pode querer agendar uma consulta com a reabilitação mas ele pode
> escolher todos os profissionais disponíveis ali."*

Marcar passa a ter um primeiro passo: **com quem**.

## Contexto

`book-appointment.tsx` já escolhe data, hora, tipo de tratamento e formato, e
já sabe pagar. O que falta é a pessoa — hoje a consulta é da clínica, e o
terapeuta é quem marcou.

## Passos

1. Uma lista de profissionais disponíveis ao paciente: nome, tipo, registro,
   preço, idioma e se atende por vídeo.
2. Escolhido o profissional, a agenda mostrada é a **dele** (T-4).
3. O tipo do profissional decide o que se pode pedir: médico e psicólogo podem
   ser só-vídeo; a reabilitação oferece os três formatos (098).
4. Idioma é filtro de verdade, não enfeite: *"brasileiros que vivem no exterior
   e querem profissionais brasileiros"* é o caso de uso do pedido.

## Critérios de aceite

- [x] O paciente vê os profissionais que **você ligou**, com preço, idioma,
      registro e formato.
- [x] A agenda muda ao trocar de profissional — nas duas telas, com o id na
      chave do cache.
- [x] Prática sem quem atender não aparece; sem resultado, a tela diz o que
      fazer em vez de ficar vazia.
- [x] O filtro de idioma é de verdade, e é o primeiro da tela.
- [x] Marcar com a reabilitação continua **a um toque** — escolher profissional
      é um botão ao lado, não um passo antes.
- [x] A consulta nasce no inquilino de quem atende, com o **preço**, a **vaga**
      e o **tipo de tratamento** dele.
- [ ] O vínculo nascer do pagamento é a **T-6**.
