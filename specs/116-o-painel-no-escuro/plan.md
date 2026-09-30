# Atividade 116 — O painel no escuro

**Aberta:** 30/09/2026. O Bruno mandou uma captura de `/admin/blood-pressure` com
duas palavras: *"cores ruins"*.

## O que a captura mostra

Na tela dele, no cartão do QR:

- o parágrafo *"Scan this QR code with a mobile phone…"* quase ilegível, cinza
  sobre cinza;
- os botões **Copy Link** e **Open Page** praticamente invisíveis;
- a caixa de nota em creme, com o texto cinza claro por cima.

## O mecanismo, que não é o óbvio

Eu ia registrar isto como "falta o `dark:`". **Está errado, e é importante que
esteja:** o painel é **escuro por padrão**. O `:root` de `app/globals.css` *é* o
tema escuro (`BA ONE DESIGN SYSTEM v4 — ADMIN (dark)`), e é a área do paciente
(`.public-site`, `/dashboard/**`) que é clara. Não há classe `.dark` a ser ligada.

Então acrescentar `dark:bg-…` **não faria nada** — a variante nunca entraria.

O que acontece de facto é a mistura:

| a peça | de onde vem a cor | resultado |
|---|---|---|
| `bg-amber-50` | paleta crua, clara, fixa | caixa creme |
| `text-muted-foreground` | token, e o token é do tema **escuro** | texto cinza claro |

**Fundo cru claro + texto por token escuro = texto invisível.** É a caixa da nota
da captura, exatamente. E o botão `variant="outline"` é o contrário: todo por
token, sobre um cartão que ficou escuro — some no fundo.

## O tamanho

Contando as classes de paleta crua clara (`bg-*-50` e `bg-*-100`) em `app/admin`:

| tela | classes cruas |
|---|---|
| `marketing/instagram-studio` | 65 |
| `patients/[id]` (a ficha) | 63 |
| `journey` | 37 |
| `ai-coworker` | 33 |
| `patients/[id]/permissions` | 22 |
| `appointments` | 22 |
| `blood-pressure` | 15 |

Não é uma tela: é o painel inteiro, escrito como se fosse claro.

## O conserto

**Trocar a paleta crua por token**, não acrescentar variantes. Os tokens já
existem — `--ba1-ok`, `--ba1-warn`, `--ba1-bad`, `--ba1-health`, mais os
semânticos do shadcn — e 33 telas já os usam. O que falta é o resto usar também.

Onde não houver token que sirva, o token nasce em `globals.css` — e nasce **uma
vez**, não por tela.

## A trava

Uma varredura que conta as classes cruas por tela e **só deixa o número descer**.
Sem ela, esta atividade conserta sete telas e a oitava nasce errada na semana
seguinte — que é como as sete chegaram aqui.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [A varredura que mede, e a trava](t-1-a-varredura-e-a-trava.md) | pendente |
| T-2 | [As telas da pressão](t-2-as-telas-da-pressao.md) | pendente |
| T-3 | [A ficha do paciente e a agenda](t-3-a-ficha-e-a-agenda.md) | pendente |

## Suposições

- **A medição é do contraste que sai, não da classe que entra.** Trocar
  `bg-amber-50` por um token só é melhoria se o contraste medido subir — já
  troquei 4,9 por 3,2 anunciando que estava a melhorar. A T-1 mede antes.
- **O cartão do QR sai na 115 T-1**, então ele não entra na contagem da T-2 —
  seria consertar o que vai ser apagado.
- **`instagram-studio` lidera a lista e não entra nas três tarefas**: não é tela
  de uso diário da clínica. Entra pela trava, quando alguém lhe tocar.
- O alvo é o painel. A área do paciente é clara por desenho e não tem este
  defeito — mas o app é o alvo real do paciente, e ele tem tema próprio.
