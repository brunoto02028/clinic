# 101 — O vídeo, o artigo e o agendamento feito pela clínica

**Aberta em:** 28/09/2026
**Pedido do Bruno:**

> *"Eu quero que você revise toda essa parte dos artigos. Quero que você revise
> toda a parte dos vídeos, do paciente e da clínica para fazer os agendamentos
> por vídeo, porque eu não vi essa parte do vídeo funcionando ainda."*
>
> *"Do lado da clínica, eu quero poder agendar uma consulta e atribuir a um
> paciente específico. E também poder escolher o tipo de consulta — se é por
> vídeo, presencial, na casa do paciente —, atribuir aquele paciente que falou
> com você por telefone, e determinar os horários. E claro que isso vai refletir
> lá no aplicativo, na área do paciente. E o paciente vai ter que pagar e fazer a
> confirmação do agendamento."*
>
> *"Pode começar pelo vídeo, mas eu quero que você confirme, rode o QA e o code
> review de ponta a ponta, e aí vai para a próxima tarefa. Não pode ter erro mais
> isso, a gente está bastante tempo nas mesmas coisas."*

## Objetivo

Três funcionalidades **que já existem no código** e que o Bruno não conseguiu
usar. A atividade não é construí-las: é percorrer cada uma de ponta a ponta,
medir, e consertar o que impede alguém de chegar lá.

O padrão das últimas atividades é sempre o mesmo, e é dele que esta nasce:
*"entregue"* significando **"a rota responde"** em vez de **"alguém chega lá"**.
A varredura da [100 T-4](../100-o-caminho-ate-o-paciente/) mecanizou uma parte
disso (toda tela tem caminho); o que ela não pega é o **botão que existe, está
visível, e só falha** — que é onde o vídeo estava.

## Decisões

**O pagamento é a confirmação.** O Bruno: *"no pagamento já é a confirmação do
agendamento"*. Não existe um segundo botão de "confirmar" depois de pagar: a
consulta marcada pela clínica nasce aguardando o paciente, e o que a move para
confirmada é o pagamento concluído.

**Nada sai para o paciente sozinho.** A consulta marcada pela clínica aparece no
app, mas quem avisa é um botão que alguém aperta — a regra da casa desde
17/09/2026 vale aqui igual.

**Botão que só falha não deve existir.** Onde o servidor recusa por permissão, a
tela não oferece o botão — e diz por quê, em vez de calar. Esconder sem explicar
é a mesma falha de outro jeito.

## Tarefas

| | tarefa | status |
|---|---|---|
| T-1 | [A consulta por vídeo, de ponta a ponta](t-1-o-video-de-ponta-a-ponta.md) | 🟢 concluída |
| T-2 | [O artigo, da clínica até a tela do paciente](t-2-o-artigo-de-ponta-a-ponta.md) | 🟢 concluída |
| T-3 | [A clínica marca, o paciente vê, paga e está confirmado](t-3-a-clinica-marca-o-paciente-paga.md) | pendente |

## Suposições

Coisas que decidi sem perguntar, e que valem conferir:

1. **A clínica marca para qualquer terapeuta.** Hoje `/api/admin/appointments`
   grava `therapistId = quem criou`, sempre. Numa clínica com mais de um
   terapeuta isso está errado, mas mudar o campo mexe em quem entra na sala — e
   é decisão de modelo, não de tela. A T-3 propõe o seletor; até ela, quem marca
   é quem atende.
2. **O preço vem do tipo de tratamento**, e a clínica pode sobrescrever. É o que
   a tela já faz.
3. **Cortesia continua existindo** (`waiveCharge`): uma consulta de preço zero
   não vai para pagamento nenhum e já nasce confirmada.
4. **O paciente não escolhe o horário** numa consulta marcada pela clínica. Ele
   aceita pagando, ou pede outro formato pelo caminho da
   [098](../098-o-paciente-escolhe-o-formato/).
