# Atividade 112 — A ordem é de quem?

**Aberta:** 30/09/2026, a pedido do Bruno.

## O que ele pediu

> *"Na página de permissões, eu queria poder alterar a ordem de algum botão ou
> grupo. Dividir tb CONTENT & EDUCATION - WELLBEING & SELF-CARE - APP AREAS -
> CLINICAL… acho que ficaria mais organizado. Seria possível cada usuário poder
> mudar a posição no seu app? Tipo eles podem personalizar o app deles? Tb na
> área da clinic, eu poder arrastar e mudar as ordens um do outro e isso
> refletir no app."*

## O que já existe, e por que isto não é "mais do mesmo"

Ontem (110 T-5) as listas passaram a sair em **ordem alfabética**, dentro de cada
grupo, pelo rótulo da língua exibida. Isso foi entregue e medido.

O pedido de agora **conflita com aquilo**, e é o ponto central desta atividade:
uma lista não pode ser alfabética *e* arrastada ao mesmo tempo. Há três donos
possíveis para a ordem — o alfabeto, a clínica e o paciente — e eles precisam de
uma hierarquia, não de três telas brigando.

## A proposta: uma cascata, e não uma disputa

| quem | quando vale |
|---|---|
| **o alfabeto** | o padrão, quando ninguém ordenou nada |
| **a clínica** | quando alguém arrastou no painel — vale para todos os pacientes dela |
| **o paciente** | quando ele arrastou no próprio app — vale só para ele |

Cada nível só entra em cena quando alguém agiu. Uma clínica que nunca arrastou
continua com a lista alfabética; um paciente que nunca personalizou vê a ordem da
clínica.

**Confirmado pelo Bruno em 30/09/2026.** Inclusive a consequência: quando a
clínica mudar a ordem **depois** de um paciente ter personalizado a dele, a do
paciente continua valendo — quem arrumou a própria casa não quer que a arrumem de
novo.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [Os grupos chegam ao app](t-1-os-grupos.md) | 🟢 implementada — QA pendente |
| T-2 | [A clínica arrasta, e o app obedece](t-2-a-clinica-arrasta.md) | pendente |
| T-3 | [O paciente arruma o próprio app](t-3-o-paciente-arruma.md) | pendente |
| T-4 | [Voltar ao alfabeto](t-4-voltar-ao-alfabeto.md) | pendente |

## Suposições — o que precisa de validação antes de virar código

- ~~A cascata~~ e ~~"dividir os grupos"~~ — **respondidas em 30/09**. A cascata
  está confirmada, e "dividir" era **levar os grupos ao app**, não mexer nos do
  painel: o menu do paciente é hoje uma lista única de vinte linhas, e ele quer a
  mesma leitura agrupada que a clínica tem. Ver a T-1.
- ~~Os nomes dos grupos no app~~ — **o Bruno aceitou a proposta da T-1** em
  30/09 (*"aceito suas recomendações"*): *Seu tratamento · Seu dia a dia ·
  Aprender · Sua conta*. Ficam à vista no QA da tela, que é onde um nome errado
  aparece.
- **Arrastar na web e no telefone não é o mesmo gesto.** No painel é
  drag-and-drop com o ponteiro; no app é segurar-e-arrastar, e compete com o
  gesto de puxar para atualizar (atividade 113). As duas atividades tocam a mesma
  tela e é melhor que saiam juntas.
- **A ordem do paciente tem de sobreviver ao logout**, então é dado no servidor e
  não preferência local — o que a torna mais cara do que parece.
- **Módulo desligado não pode "guardar lugar".** Se a clínica ordena e depois
  desliga um módulo, a lista do paciente fecha sem buraco — foi medido na 110.
