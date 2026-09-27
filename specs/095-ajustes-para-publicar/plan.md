# Atividade 095 — Os ajustes para publicar

**Aberta em:** 27/09/2026
**Pedido do Bruno:** *"Criar Spec para esses ajustes urgente, pois precisamos
publicar esse APP."*

Oito ajustes, ditados de uma vez depois de ele usar o sistema. Dois deles
**impedem testar o app** (o aviso não chega ao telefone, e não há por onde ver
uma consulta por vídeo); um é de **segurança com criança**; os outros cinco são
o produto ficando bom o bastante para outra pessoa usar.

## Tarefas

| T-N | nome | depende de | status |
|---|---|---|---|
| T-1 | O aviso não chega ao telefone do Bruno | — | **feita** (27/09) — em QA |
| T-2 | Onde ver, e como testar, uma consulta por vídeo | — | **feita** (27/09) — roteiro em [como-testar-video.md](como-testar-video.md) |
| T-3 | Cadastrar menor exige dizer a relação com ele | — | **feita** (27/09) |
| T-4 | A cor do "Mark as done" | — | **feita** (27/09) — medida, ver a tarefa |
| T-5 | Enviar exercício avulso, não a pasta inteira | — | **feita** (27/09) |
| T-6 | Responder ao vídeo do paciente, e arquivá-lo | — | **feita** (27/09) |
| T-7 | Pain Trend: o paciente relata por data | — | **feita** (27/09) — metade já existia |
| T-8 | O calendário mostra disponibilidade de verdade | T-2 | **feita** (27/09) — os dois lados |
| T-9 | Onde o paciente lê o aviso (link, separação, lido) | T-1 | pendente |

A T-9 entrou depois, em 27/09: *"quando eu enviar a um paciente ou todos os
usuários, eles recebem e leem onde?"*. A resposta é **Mensagens, no app** — e
rastreá-la mostrou dois furos de entorno que a tarefa conserta.

**Ordem sugerida:** T-1 e T-2 primeiro, porque sem eles você não consegue
**testar** o resto. Depois T-3 (é regra de segurança, não estética), T-4 e T-5
(são rápidas e aparecem toda hora), e por fim T-6, T-7, T-8 e T-9, que são
telas novas. A T-9 anda junto da T-1: as duas são sobre o aviso chegar.

## Decisões que já tomei, e você pode derrubar

**T-3 — a relação é obrigatória, e a lista é fechada.** Campo de texto livre
viraria "resp", "mae", "Mãe " e nada disso responde a pergunta que importa
depois. Lista: mãe, pai, madrasta, padrasto, avó, avô, irmã, irmão, tia, tio,
guardiã/guardião legal, outro (com campo obrigatório ao escolher "outro").
Guardado no cadastro e **impresso no consentimento e no pedido de exame**, porque
o ponto é justamente ter prova de quem respondeu pela criança.

**T-3 — a regra do acompanhamento sai do texto e vira tela.** Os termos 1.3 já
dizem que menor de 18 comparece acompanhado, e que o terapeuta pode encerrar a
sessão em que isso não aconteça. A tarefa põe isso onde se lê na hora: no card
da consulta de um menor, no painel, e na confirmação que o responsável recebe.

**T-5 — "exercício avulso" não substitui a pasta.** Quem já manda pasta continua
mandando. O que muda é passar a existir **um** botão de "mandar este" na tela do
exercício, e o paciente ver a lista do que foi mandado para ele, não o nome da
pasta da clínica.

**T-6 — arquivar é esconder da fila, não apagar.** O vídeo continua no prontuário
do paciente e no histórico. O que sai é da lista de "para olhar".

**T-8 — disponibilidade vem do que já existe.** `/admin/availability` já guarda
janelas e bloqueios; a tela do paciente hoje não os mostra. A tarefa é mostrar, e
não inventar um segundo cadastro de horário.

## Suposições

- **T-1** é diagnóstico antes de conserto: pode ser aparelho não registrado,
  permissão negada no telefone, ou credencial de push do build. A tarefa começa
  medindo, e termina com o painel **dizendo** quantos aparelhos o paciente tem —
  para esta pergunta nunca mais depender de mim.
- **T-4**: medir o contraste da cor atual **antes** de trocar, e mostrar os dois
  números. Já troquei uma cor anunciando melhora e piorei.
- **T-6**: responder por áudio reusa a gravação que o paciente já tem (089 T-5);
  responder por vídeo reusa o upload que o exercício já tem.
- **T-7**: "relatar por data" é registrar dor **de um dia que já passou** — quem
  não abriu o app no dia não perde o registro.
- Nada aqui envia nada a paciente automaticamente. Toda saída continua com botão
  e prévia.

## O que esta spec **não** resolve

O que está em [[094-o-que-depende-do-bruno]]: chave live do Stripe, webhook,
logo no painel do Stripe, build autorizado, Apple Pay, DPA da Daily, a segunda
cópia dos termos. T-1 pode esbarrar no build (se a credencial de push estiver
errada, só um build novo conserta).
