# Atividade 103 — A consulta que já passou: desfecho, falta e cancelamento

## Objetivo

> O Bruno, 29/09/2026: *"quando uma consulta não acontece, é cancelada, isso
> precisa ficar registrado no APP e no sistema da clinic certo?"* e, depois do
> vídeo funcionar: *"agora só organizar quando já passou a consulta, perdeu um
> agendamento etc."*

Fechar o que venceu. Hoje uma consulta que passou **fica "Confirmada" para
sempre** — no painel e no app do paciente.

## O que eu encontrei antes de propor

| situação | existe? | onde |
|---|---|---|
| Cancelar, com reembolso de cobrança, taxa e repasse | ✅ | `/admin/cancellations` |
| Marcar `COMPLETED`, `CANCELLED`, `NO_SHOW` por consulta | ✅ | `/admin/appointments`, botão a botão |
| Falta **não** devolve a sessão ao pacote; cancelar devolve | ✅ e deliberado | `app/api/appointments/[id]` |
| Paciente **pedir** cancelamento, com motivo e antecedência | ✅ a rota | `/api/patient/cancellation` |
| …e a tela no app que chama essa rota | ❌ | nenhuma |
| Alguém fechar a consulta que venceu | ❌ | **nenhum** cron toca em consulta vencida |
| Saber se a videochamada aconteceu | ❌ | a sala é criada, e nada registra quem entrou |

Ou seja: as ações existem quase todas. **O que não existe é alguém ser levado
até elas** — e, no vídeo, a prova de o que aconteceu.

## Decisões de design

### 1. Sugerir, nunca decidir

Marcar falta tem consequência de dinheiro: a sessão **não** volta ao pacote. E a
regra da casa desde 17/09/2026 é que nada sai para paciente automaticamente.

Então nenhum cron muda status. O sistema **aponta** — uma fila de pendências — e
uma pessoa confirma. Vale para os três formatos.

### 2. Vídeo tem prova; presencial e domicílio não

O vídeo é o único formato em que o sistema sabe o que aconteceu: a sala é criada
por pessoa, com token próprio. Registrar quem entrou e quando transforma um
palpite numa sugestão com fundamento — *"ninguém entrou"*, *"só o paciente
entrou"*, *"os dois entraram, 22 minutos"*.

**"Só o paciente entrou" não é falta dele.** É falta da clínica, e a fila precisa
dizer isso com todas as letras, porque a consequência é oposta.

Presencial e domicílio ninguém sabe pelo sistema — só quem estava lá. Para esses,
o valor está em **não deixar pendente**.

### 3. O app não mente sobre o que passou

Uma consulta vencida com status aberto para de dizer "Confirmada". Ela não diz
"Faltou" tampouco — ninguém decidiu ainda. Diz um terceiro estado honesto:
*aguardando a clínica*.

### 4. O paciente pode desmarcar

A rota existe, pede motivo e calcula a antecedência. Falta a tela. Sem ela, quem
não pode vir simplesmente não vem — e vira falta que ninguém entende.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [Quem entrou na sala fica registrado](t-1-quem-entrou-na-sala.md) | implementada — aguardando QA |
| T-2 | [A fila do que venceu, no painel](t-2-a-fila-do-que-venceu.md) | implementada — aguardando QA |
| T-3 | [O app não diz "Confirmada" para o que passou](t-3-o-app-nao-mente.md) | pendente |
| T-4 | [O paciente desmarca pelo app](t-4-o-paciente-desmarca.md) | pendente |
| T-5 | [A chamada que não pode acontecer não tem botão](t-5-sem-botao-sem-porta.md) | 🟢 concluída (29/09) |

**T-1 antes da T-2**, porque é ela que dá fundamento à sugestão. T-3 e T-4 são
independentes. **T-5 saiu na frente** — era pequena, e o Bruno pediu no meio do
planejamento.

## Suposições — para você validar

1. **Uma consulta "vence" no fim da janela**: horário + duração + 30 minutos de
   folga, a mesma folga que a sala de vídeo já usa. Antes disso ela ainda pode
   estar acontecendo.
2. **Só a clínica decide o desfecho.** O paciente não marca "aconteceu".
3. **Sem prazo automático**: uma consulta fica na fila até alguém resolver, sem
   virar falta por decurso de prazo.
4. **Cancelamento pedido pelo paciente continua sendo pedido**, não execução: a
   clínica aprova, como a rota já faz hoje. O reembolso segue a regra que já
   existe.
5. **A fila é por inquilino**, como tudo o mais, e um profissional intermediado
   vê só as consultas dele.
