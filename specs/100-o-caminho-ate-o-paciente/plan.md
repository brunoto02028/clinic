# Atividade 100 — O caminho até o paciente

**Aberta em:** 28/09/2026
**Pedido do Bruno:** *"Organiza isso dentro das specs para não se perder"* — depois
de três tentativas de achar coisas que já existiam.

## O padrão, dito de uma vez

Em 28/09 o Bruno tentou usar quatro funcionalidades entregues e **não
conseguiu chegar a nenhuma delas**. Nenhuma estava quebrada:

| o que ele procurou | onde estava | por que não achou |
|---|---|---|
| A seção educacional | `/admin/education` | 9ª aba de **Marketing**, chamada "Education" |
| Atribuir material a um paciente | `/admin/education/assignments` | **nenhum menu citava** |
| O monitoramento / biohacking | `/admin/biohacking` | **nenhuma seção citava** — ele digitou o endereço à mão |
| Como vincular um artigo | a tela de atribuir | ela abria com o seletor **vazio** e não dizia o porquê |

E duas consequências disso:

- ao digitar `/admin/biohacking` à mão, ele errou uma barra —
  `bpr.clinic//admin/biohacking` — e recebeu **"Something went wrong"** com um
  texto sobre `History` e `replaceState`
- ao abrir a tela de atribuir vindo de Clínico, o menu **acendia Marketing**,
  porque a seção de marketing ainda reivindicava a rota

**A lição não é sobre estas quatro telas.** É que "entregue" vinha significando
"a rota responde", e não "alguém chega lá". Três atividades seguidas — 096, 099
e a 095 antes delas — terminaram com funcionalidade completa e caminho
ausente.

## O que foi feito

**1. O material do paciente saiu de Marketing e foi para Clínico**, ao lado de
Exercícios e Protocolos, com o nome **"Material do paciente"** — "Education"
descrevia a tabela, não o que a pessoa foi ali fazer.

**2. "Atribuir material" virou entrada própria no menu.** É o passo que faz o
material chegar a alguém, e era o único invisível.

**3. O monitoramento entrou no menu**, como **"Monitoramento"**, em Clínico. É
onde moram a chave da automação dos relatórios e a fila de desvios.

**4. Marketing deixou de reivindicar `/admin/education`**, então o menu acende
a seção certa.

**5. A tela de atribuir passou a explicar os dois passos** e a oferecer o
primeiro. Ela dizia *"Assign educational content to patients"* e abria um
seletor vazio; agora diz que são dois passos, traz os artigos dali mesmo, e a
tela vazia sabe **qual** dos dois está faltando.

**6. A página de Artigos aponta para lá.** Foi de onde ele perguntou.

**7. Barra dobrada no começo do caminho passa a ser corrigida** com um desvio
308, antes de qualquer rota existir. `bpr.clinic//admin/x` é um erro de
digitação, não um motivo para uma tela de erro.

## O caminho completo, escrito

**Artigo do site → aplicativo do paciente**

1. **Clínico → Material do paciente** → *Trazer artigos* → escolher → *Trazer N*
   - eles entram **restritos**: ninguém os vê ainda
2. **Clínico → Atribuir material** → *Atribuir a um paciente* → material +
   paciente (+ observação, prazo, obrigatório)
3. No aplicativo: **Perfil → Artigos** → seção **"Para você"**

Para deixar um material visível a **toda** a clínica, sem atribuir: na lista de
Material do paciente, clicar no selo **"Só atribuído"** — ele vira **"Na
biblioteca"**.

**Monitoramento e relatórios**

1. **Clínico → Monitoramento** → chave *"Automatic patient reports"*
2. Na ficha de um paciente → aba **Monitoring** → *Generate report*

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | O menu leva a tudo o que existe | **concluído** |
| T-2 | A tela de atribuir explica os dois passos | **concluído** |
| T-3 | Barra dobrada não vira tela de erro | **concluído** |
| T-4 | Uma varredura: que outra tela não tem caminho? | pendente |

## Suposições

- **Nomes em português onde o Bruno lê.** "Material do paciente",
  "Monitoramento", "Atribuir material" — o menu tem os dois idiomas, e o que
  importa é o rótulo dele estar em quem usa.
- **Nada foi movido de lugar sem ganhar nome novo**, para o caminho antigo não
  ficar na cabeça de ninguém.

## O que esta atividade **não** faz

- Não mexe no que as telas fazem, só em como se chega a elas.
- Não renomeia rotas: `/admin/education` continua sendo `/admin/education`, e
  os links antigos continuam valendo.
