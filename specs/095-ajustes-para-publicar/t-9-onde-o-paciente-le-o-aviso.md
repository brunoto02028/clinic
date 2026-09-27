# T-9: Onde o paciente lê o aviso

**Status:** pendente
**Depende de:** T-1

## Objetivo

Que a pessoa que envia saiba onde aquilo vai aparecer, e que a pessoa que recebe
ache. Hoje funciona, e por dois motivos não parece.

## Contexto

Pergunta do Bruno: *"quando eu enviar a um paciente ou todos os usuários, eles
recebem e leem onde?"*

**Como é hoje, rastreado no código:**

1. O envio cria **uma `ClinicMessage` por paciente**, já na língua dele, com
   `kind: "broadcast"` (`app/api/admin/broadcasts/route.ts`).
2. O paciente lê em **Mensagens, no app** — `/api/patient/messages` devolve
   tudo, e a tela mostra o título em maiúsculas quando o `kind` não é conversa.
3. O push abre exatamente essa tela: `url: "/(app)/(clinica)/messages"`.
4. No navegador, em `/dashboard/questions`.
5. E-mail/WhatsApp saem com um resumo e um link.

Ou seja: chega. O que está errado é o entorno.

**Furo 1 — o link do e-mail aponta para o portal web.** O texto diz *"Read in
your portal: …/dashboard/questions"*. Depois do lançamento **o paciente perde o
acesso à web** — o app é o único alvo dele. Quem seguir aquele link vai bater
numa porta fechada, e o aviso morre ali.

**Furo 2 — o comunicado mora dentro da conversa com o terapeuta.** Um aviso para
os oito pacientes aparece no mesmo fio em que a pessoa fala com quem a atende.
Funciona, e confunde duas coisas de naturezas diferentes: uma é conversa, a outra
é mural. Some no meio do histórico, e não dá para saber se foi lido enquanto
mural.

**Furo 3 — quem envia não vê onde cai.** A tela diz "sees the announcement in the
portal" num cinza de 10px, e não mostra a cara do que o paciente vai ver.

## Passos

1. **O link vai para o app.** No e-mail e no WhatsApp, apontar para o deep link
   (`bprclinic://…/messages`) com o endereço web como alternativa para quem
   ainda não tem o app — e não o contrário.
2. **Separar aviso de conversa** na tela do paciente: ou uma seção "Avisos da
   clínica" no topo, ou um cartão visualmente distinto que não se confunda com o
   balão do terapeuta. Manter o histórico: nada sai de onde está.
3. **Marcar como lido** o que é aviso, e o painel mostrar quantos leram — o
   `readAt` já existe em `ClinicMessage`.
4. **Na prévia do envio**, mostrar onde vai cair: "em Mensagens, no app" e a
   aparência do cartão. A prévia já mostra o texto; falta dizer o lugar.
5. Conferir a contagem de não lidos do app com o aviso incluído.

## Arquivos afetados

- `app/api/admin/broadcasts/route.ts` (o texto e o link de e-mail/WhatsApp)
- `lib/notify-patient.ts` ou equivalente
- `mobile/app/(app)/(clinica)/messages.tsx` (a separação)
- `app/admin/notifications/page.tsx` (a prévia dizendo o lugar)
- `app/dashboard/questions` (enquanto a web existir)

## Critérios de aceite

- [ ] O link do e-mail/WhatsApp abre o app de quem tem o app
- [ ] Aviso da clínica não se confunde com mensagem do terapeuta
- [ ] O painel mostra quantos leram o aviso
- [ ] A prévia diz onde o aviso vai aparecer
- [ ] O contador de não lidos conta o aviso
