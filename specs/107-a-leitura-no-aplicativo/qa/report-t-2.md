# QA — 107 T-2: quem terminou de ler quer o próximo

**Data:** 29/09/2026
**Onde:** aplicativo do paciente, build web em `http://localhost:8090`, API
local em `127.0.0.1:4020`, ambos do worktree
`C:\Users\bruno\orca\workspaces\clinic\app_clinic`. Viewport 414x896.
**Resultado geral:** aprovado com uma ressalva — os 4 cenários passaram; a
ressalva é que o **caminho de volta desaparece junto com as sugestões**.

**Pacientes de teste:** `Qa107 PacienteTeste`
(`qa107.paciente@example.test`, clínica `QA107 Clinica de Teste`, 10 materiais)
e `Qa107 Unico` (`qa107.unico@example.test`, clínica
`QA107 Clinica de Um So`, **1** material — para provar que a seção some).
Nenhum paciente real foi tocado.

## Uma armadilha de medição, registrada porque quase me enganou

Ao tocar num atalho, a URL mudou e `document.querySelector` continuou a devolver
o artigo **anterior**. Parecia um defeito grave: "o atalho não abre o artigo
certo".

Não era. O Expo Router mantém a tela anterior **montada** na pilha; ela fica com
`0x0` de tamanho. O primeiro `[data-testid="education-detail"]` do DOM é o
velho, o visível é o segundo:

| tela montada | retângulo | contém o centro da viewport |
|---|---|---|
| Kneecap Pain (anterior) | `0x0` em (0,0) | não |
| **Hamstring Tendinosis** (nova) | **414x832** em (0,64) | **sim** |

Daí em diante toda medição foi feita na tela com largura > 0, confirmada por
`elementFromPoint` no centro da viewport. **Afirmar "reprovou" com a primeira
leitura teria sido uma falha inventada.**

## Resumo

| # | cenário | resultado |
|---|---|---|
| 2.1 | artigo com irmãos de categoria: até 3, sem o atual | aprovado — 3 de 3, o atual fora |
| 2.2 | artigo sem irmãos: recentes ou seção ausente, nunca vazia | aprovado — os dois casos medidos |
| 2.3 | tocar num atalho abre o artigo certo; o voltar volta ao anterior | aprovado |
| 2.4 | o caminho de volta leva à lista | aprovado — com ressalva |

---

## 2.1 — com irmãos de categoria: três atalhos, sem o próprio

Artigo aberto: **Hamstring Tendinosis**, categoria `Protocols` (8 materiais).

```json
{
  "id_na_url": "cmumq5pi6000qxzccc45xv28s",
  "titulo_visivel": "Hamstring Tendinosis",
  "secao_titulo": "More in this topic",
  "n_atalhos": 3,
  "atalhos": [
    "Carpal Tunnel Syndrome: Why Your Hand Goes Numb at Night, an...",
    "QA107 marcacao nos tres lugares...",
    "Trochanteric Bursitis..."
  ],
  "inclui_o_proprio": false,
  "tem_ver_todos": true
}
```

**Três atalhos** (o limite), **o próprio artigo não está entre eles**, e o
título da seção é **"More in this topic"** — que é a afirmação que se pode
fazer, porque a categoria é uma relação que existe.

O mesmo medido em *Chronic Lower Back Pain*: 3 atalhos, "More in this topic",
sem o próprio.

Screenshot: `screenshots/t-2-fim-do-artigo.png`

---

## 2.2 — sem irmãos, e sem nada: dois casos, medidos separados

### Caso A — sozinho na categoria, mas há outros materiais

Artigo: **Kneecap Pain (Patellofemoral Pain)**, único da categoria
`Solo topic`.

```json
{
  "secao_titulo": "More to read",
  "n_atalhos": 3,
  "atalhos": [
    "Carpal Tunnel Syndrome: Why Your Hand Goes Numb at Night...",
    "QA107 marcacao nos tres lugares...",
    "Hamstring Tendinosis..."
  ],
  "inclui_o_proprio": false,
  "texto_ver_todos": "See all materials"
}
```

O título mudou para **"More to read"**, não "More in this topic". É a diferença
que a T-2 pediu: a primeira afirma parentesco, a segunda não afirma nada. Os
três títulos oferecidos são **diferentes do atual**, e o próprio ficou fora.

### Caso B — não há nada para oferecer

Paciente `qa107.unico@example.test`, numa clínica com **1** material publicado.
Aberto esse único material:

```json
{
  "titulo_visivel": "O unico material desta clinica",
  "SECAO_CONTINUAR_LENDO": "AUSENTE",
  "n_atalhos": 0,
  "ver_todos_materiais": "AUSENTE",
  "tem_texto_more": false
}
```

**A seção não existe no DOM** — não é uma seção vazia, não é um título órfão,
não é uma moldura. `tem_texto_more: false` confirma que nem o rótulo sobrou. O
artigo acaba nas estrelas e no "Mark as completed".

Screenshot: `screenshots/t-2-sem-candidatos-secao-some.png`

---

## 2.3 — tocar num atalho, e o voltar

**Ida.** Estando em *Kneecap Pain*, toquei no atalho de *Hamstring Tendinosis*:

| medida | resultado |
|---|---|
| URL | `/education/cmumq5pi6000qxzccc45xv28s` (Hamstring) |
| tela visível | **Hamstring Tendinosis** (414x832) |
| título da seção nela | "More in this topic" (a categoria dele tem 7 irmãos) |
| atalhos | 3, sem o próprio |

O atalho abriu **o artigo certo**, e a seção dele recalculou — o rótulo mudou de
"More to read" (Kneecap, sozinho) para "More in this topic" (Hamstring, com
irmãos). Não é a mesma tela com outro texto: é outro artigo.

**Volta.** Toquei na seta do cabeçalho:

```json
{
  "url": "/education/cmumq5phk000axzccd90vk9wl",
  "telas_montadas": 1,
  "telas_visiveis": 1,
  "titulo_visivel": "Kneecap Pain (Patellofemoral Pain): The Truth About...",
  "voltou_para_o_artigo_anterior": true
}
```

**Voltou para o artigo anterior, não para a lista.** É o que o `push` prometia,
e a pilha ficou limpa (1 tela montada, 1 visível — a que foi desempilhada não
ficou para trás).

---

## 2.4 — o caminho de volta leva à lista

Toquei em **"See all materials"**:

```json
{
  "url": "/education",
  "tem_lista": true,
  "n_cartoes": 10,
  "telas_de_artigo_montadas": 0
}
```

Chegou na lista, com os 10 cartões, e **nenhuma tela de artigo ficou montada** —
o `router.replace` limpou a pilha, que é o comportamento certo para um "voltar
para a lista" (senão a seta do cabeçalho passaria a desfazer a leitura toda).

---

## Erros de console

Nenhum erro vindo desta tela. Os 4 erros da sessão são a sonda de login antes de
a API subir e três capas apontando para `localhost:3000` (relatório da T-3,
achado 3). Avisos: os dois do build web.

---

## Falhas e recomendações

Nenhum cenário reprovou.

### A ressalva: o caminho de volta desaparece junto com as sugestões

`ver-todos-materiais` está **dentro** do bloco `continuar-lendo`, depois do
`return null`. Consequência medida no caso B: o paciente da clínica com um
material só fica **sem nenhum caminho de volta no fim do artigo** — só a seta do
cabeçalho, que é exatamente o que a T-2 diagnosticou como insuficiente
("o caminho de volta só existia pela seta do cabeçalho").

O critério de aceite "Há caminho de volta para a lista" é incondicional, e neste
caso não há. É a única leitura em que os dois não coincidem.

**Sugestão:** tirar o `ver-todos-materiais` de dentro do bloco e desenhá-lo
sempre — a seção de sugestões continua sumindo quando não há o que sugerir, e o
caminho de volta deixa de depender dela. São duas coisas diferentes acopladas
num `if` só.

Vale pouco na clínica de hoje (dezenas de textos), e vale muito num estúdio novo
que ainda tem um material só — que é precisamente quem mais precisa de achar o
resto.
