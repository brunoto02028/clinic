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
| T-2 | Onde ver, e como testar, uma consulta por vídeo | — | **concluída** — QA com ressalvas, corrigidas |
| T-3 | Cadastrar menor exige dizer a relação com ele | — | **concluída** — QA reprovou 3.5 e 3.7, corrigidos. **Falta a tela no painel** |
| T-4 | A cor do "Mark as done" | — | **concluída** — medida antes e depois |
| T-5 | Enviar exercício avulso, não a pasta inteira | — | **concluída** — QA reprovou 5.4, corrigido |
| T-6 | Responder ao vídeo do paciente, e arquivá-lo | — | **concluída** — QA reprovou 6.3, corrigido |
| T-7 | Pain Trend: o paciente relata por data | — | **concluída** — QA reprovou 7.6 (fuso), corrigido |
| T-8 | O calendário mostra disponibilidade de verdade | T-2 | **concluída** — QA reprovou 8.6, corrigido |
| T-9 | Onde o paciente lê o aviso (link, separação, lido) | T-1 | **concluída** — 9.3 parcial por falta de universal link |

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

---

## Depois do QA (28/09)

Dois QAs em paralelo mediram as nove tarefas: **27 passaram, 6 reprovaram**, 8
não foram executados (telas do app, sem build) e 8 passaram com ressalva. As
seis reprovações e as treze ressalvas estão corrigidas — o detalhe, com
evidência, está em [qa/report-095.md](qa/report-095.md).

**O que fica pendente, dito em voz alta:**

1. **A tela de cadastro de pessoa gerida no painel** (T-3, passo 3). O plano
   dizia "no app **e no painel**", e o painel não tem essa tela. Criar uma é
   funcionalidade nova, não conserto de QA.
2. **O link do aviso abrir o app** (T-9, 9.3). Falta *App Site Association* para
   um universal link. A mensagem diz onde ir; o clique ainda leva à web.
3. **Nada do lado do app chega ao telefone sem build** — cor do botão,
   calendário, cadastro de dependente, aviso como mural. O fingerprint já tinha
   mudado com o SDK do Stripe (093).

**A lição que o QA deu sobre os meus testes:** os 78 testes verdes das três
tarefas do 095A não teriam pego 5.4, 3.7 nem 3.5. Todos leem o **texto do
fonte**, e o que faltava nos três era uma linha que ninguém escreveu. Teste que
lê código pega regressão; não substitui alguém usando o produto.
