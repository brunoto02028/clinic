# T-4: O relógio parado aparece na clínica

**Status:** feita (03/10/2026)
**Depende de:** T-3

## Objetivo

Que o terapeuta veja que o relógio de um paciente parou, sem ter de abrir o
telefone dele.

## Contexto

A regra da casa: *o que está no app está na clinic*. A T-3 pôs o estado na
ligação e a tela do paciente sabe lê-lo; o painel não.

Ficou por fazer de propósito: a T-1 a T-3 fecham a **causa** (a ligação parar) e
a T-4 fecha a **visibilidade do lado de quem cuida**, que é outra decisão de
desenho — onde cabe, com que peso, e se entra na lista de pendências da clínica
ou na ficha do paciente.

## Passos

1. O `needsReauthAt` e o `lastPartialRead` sobem na rota do painel.
2. A ficha do paciente mostra *"o relógio parou em DD/MM — falta reconectar"*.
3. A lista de pacientes marca quem está assim, para não ser preciso abrir um a um.

## O defeito que a T-3 criou, e esta tarefa apanhou

O monitor da clínica filtrava `status: "CONNECTED"`. Desde que a T-3 marca uma
cadeia invalidada como `ERROR`, esse filtro fazia o paciente **desaparecer do
monitor** — a ausência silenciosa criada pela correcção que existe para a
fechar, e o terceiro caso do mesmo padrão nestas duas atividades.

A consulta passou a `{ in: ["CONNECTED", "ERROR"] }`. O `DISCONNECTED` continua
de fora: quem desligou sabe que desligou.

## Critérios, medidos

- [x] Um paciente com `needsReauthAt` aparece marcado na lista, **a vermelho** —
      calado é âmbar, e são coisas diferentes
- [x] A ficha diz **desde quando**, nas duas línguas
- [x] A ficha diz o que a última passagem não conseguiu ler
- [x] A ligação em `ERROR` **não desaparece** do monitor
- [x] Reconectar apaga a marca — a renovação bem sucedida limpa o estado (T-3)
- [x] Nada é enviado ao paciente automaticamente
- [x] 2 mutações mortas: voltar ao filtro `CONNECTED`, e inferir do `status`
