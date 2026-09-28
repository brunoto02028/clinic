# T-5: O paciente escolhe o profissional, no app

**Status:** pendente
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

- [ ] O paciente vê todos os profissionais que a plataforma oferece a ele.
- [ ] A agenda muda ao trocar de profissional.
- [ ] Profissional sem vaga não é oferecido com uma lista vazia — a tela diz
      que não há vaga e oferece outro.
- [ ] Marcar com um profissional novo **não** cria vínculo antes do pagamento.
