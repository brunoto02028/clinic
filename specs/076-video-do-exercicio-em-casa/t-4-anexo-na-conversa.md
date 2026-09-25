# T-4: App — anexo na conversa

**Status:** em andamento
**Depende de:** nenhuma

## Objetivo
O paciente anexa imagem ou PDF numa mensagem, pelo app.

## Contexto
**O servidor já faz isso.** `ClinicMessage` tem `attachmentUrl`, `attachmentName` e
`attachmentType`; `/api/patient/messages` já recebe multipart com `file`; e
`lib/chat-attachment.ts` guarda como documento do paciente (aparece em "Meus documentos") servido
com checagem de sessão — não é URL pública. A web do paciente já **mostra** anexo recebido.

Falta o app **mandar** e **mostrar**. É a tarefa mais barata da atividade.

Hoje o servidor aceita `image/*` e PDF, até 25 MB (`patient-documents-shared.ts`). **Vídeo não
entra aqui** — vídeo tem lugar próprio, preso ao exercício, que é o resto desta atividade. Um
vídeo solto numa conversa vira uma pilha sem contexto em duas semanas.

## Passos
1. Botão de anexo ao lado do campo de escrita, na tela de mensagens.
2. Escolher da galeria ou tirar foto; PDF pelo seletor de documentos.
3. Enviar por multipart usando o endpoint que já existe.
4. Mostrar o anexo na conversa — miniatura para imagem, linha com nome para PDF —, abrindo pela
   rota autenticada.
5. Recusar tipo e tamanho **antes** de subir, dizendo o limite.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/messages.tsx`
- `mobile/src/api/messages.ts`

## Critérios de aceite
- [ ] Imagem e PDF sobem e aparecem na conversa
- [ ] Vídeo é recusado aqui, com o caminho certo indicado (a tela do exercício)
- [ ] Acima de 25 MB é barrado antes do upload
- [ ] O anexo aparece também em "Meus documentos"
- [ ] O anexo recebido da clínica abre no app
- [ ] Mensagem só com anexo, sem texto, é válida (o servidor já aceita)


## O que ficou para o próximo build

**PDF depende de `expo-document-picker`**, que é dependência nativa e exige binário novo. A
imagem usa o `expo-image-picker`, já instalado, e por isso chega agora por update.

O servidor já aceita PDF — quem não sabe pedir é o app. Quando sair o próximo build, é instalar a
dependência e acrescentar a opção no mesmo menu de anexo.

## Achado durante a implementação

`/api/patient/messages` devolvia `attachmentUrl` apontando para `/api/files/[id]`, que aceita
**cookie ou token assinado — nunca o bearer do app**. A web abre porque já tem cookie; o celular
receberia 404. A tela de documentos já resolvia isso com `openUrl` assinado, e a de mensagens
não. Agora o GET assina um `attachmentOpenUrl` por mensagem e por paciente.

Ou seja: o anexo "já funcionava no servidor", mas não para o app. Só apareceu ao ligar as duas
pontas.
