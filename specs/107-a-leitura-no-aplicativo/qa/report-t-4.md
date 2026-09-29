# QA — 107 T-4: o markdown que o paciente lia cru

**Data:** 29/09/2026
**Onde:** aplicativo do paciente, build web em `http://localhost:8090`, API
local em `127.0.0.1:4020`, ambos do worktree
`C:\Users\bruno\orca\workspaces\clinic\app_clinic`. Viewport 414x896.
**Resultado geral:** aprovado com uma ressalva — os 4 cenários passaram, mas na
**citação o itálico não produz diferença visível**, porque a citação inteira já
é itálica.

**Paciente:** `Qa107 PacienteTeste` (`qa107.paciente@example.test`), clínica de
teste `QA107 Clinica de Teste`. Nenhum paciente real foi tocado.

**Como medi:** `getComputedStyle` de **cada pedaço** de texto dentro do bloco
(`fontStyle`, `fontWeight`, `textDecorationLine`), mais uma varredura de
`text-decoration: underline` na tela inteira e a contagem de sublinhados e
asteriscos literais no texto visível. Não olhei a tela para decidir: li o estilo
que cada pedaço recebeu.

## Resumo

| # | cenário | tipo | resultado |
|---|---|---|---|
| 4.1 | referências de um protocolo: títulos em itálico, sem sublinhados | UI | aprovado — 5 de 5, 0 sublinhados |
| 4.2 | `snake_case` no meio do texto continua literal | UI | aprovado |
| 4.3 | marcação não fechada, literal e sem engolir o parágrafo | UI | aprovado |
| 4.4 | parágrafo, item de lista e citação | UI | aprovado no código, com ressalva na citação |

---

## 4.1 — as referências de um protocolo, medidas pedaço a pedaço

Artigo: **Chronic Lower Back Pain**, o conteúdo real da clínica — o mesmo texto
em que o Bruno viu os sublinhados no print.

As cinco referências, com o estilo que **cada pedaço** recebeu:

| # | pedaço normal | **pedaço em itálico** | pedaço normal |
|---|---|---|---|
| 1 | `Banks, K. (2013) ` | **Maitland Peripheral Manipulation Management.** | ` Elsevier.` |
| 2 | `Banks, K. (2013) ` | **Maitland Vertebral Manipulation Management.** | ` Elsevier.` |
| 3 | `Sharkey, J. (2017) ` | **The Concise Book of Dry Needling.** | ` Lotus Publishing.` |
| 4 | `Watson, T. (2008) ` | **Electrotherapy: Evidence Based Practice.** | ` Elsevier.` |
| 5 | `Clarkson, H. M. (2013) ` | **Musculoskeletal Assessment.** | ` 3rd edn. Lippincott.` |

(os apóstrofos dos títulos "Maitland" saem no texto real; foram tirados aqui só
para o bloco não brigar com o shell que gravou este relatório)

Cada linha virou **três pedaços**: autor e ano em `fontStyle: normal`, o título
da obra em `fontStyle: italic`, editora em `normal`. **Cinco de cinco.** É
exatamente o que uma citação Harvard pede — o itálico é o que separa o título do
resto, não enfeite.

### Sublinhados na tela: zero, medido de duas formas

```json
{
  "sublinhados_na_tela": [],
  "underscores_visiveis": 0
}
```

1. Varri **todos** os elementos da tela atrás de `text-decoration-line:
   underline` — **lista vazia**. Nenhum pedaço das referências traz `underline`
   (`textDecorationLine: "none"` nos quinze pedaços).
2. Contei o caractere `_` no texto visível da tela — **0**.

Antes lia-se `_Maitland's Peripheral Manipulation Management._` com os
sublinhados na tela. Agora são zero, e o itálico está lá.

Screenshot: `screenshots/t-4-referencias-italico.png`

---

## 4.4 — parágrafo, item de lista e citação

O conteúdo real da clínica só traz marcação dentro de `<li>` (as referências) —
varri os nove materiais e não há nenhum `<p>` ou `<blockquote>` com `_` ou `**`.
Então montei um material **de QA** (texto inventado, identificado como fixture,
não é material da clínica) que põe a mesma marcação nos três lugares.

| lugar | entrada | **estilo do pedaço medido** | visível? |
|---|---|---|---|
| **parágrafo** | `_Maitland ... Management._` | `fontStyle: italic`, peso 400 | **sim** |
| **parágrafo** | `**negrito**` | `fontStyle: normal`, **peso 700** | **sim** |
| **item de lista** | `_Electrotherapy ... Practice._` | `fontStyle: italic`, peso 400 | **sim** |
| **item de lista** | `**negrito**` | `fontStyle: normal`, **peso 700** | **sim** |
| **citação** | `_Musculoskeletal Assessment._` | `fontStyle: italic`, peso 400 | **não** (ver abaixo) |
| **citação** | `**enfatiza**` | `fontStyle: italic`, **peso 700** | **sim** |

O código roda nos três lugares — `TextoComMarcacao` está em `paragrafo`, em cada
item de `lista` e em `citacao`, e os pedaços recebem o estilo certo nos três.

Screenshot: `screenshots/t-4-tres-lugares.png`

### A ressalva: o itálico dentro da citação não aparece

A citação já desenha o bloco inteiro em itálico:

```
pai_fontStyle: "italic"
pedacos: [
  { t: "Quem cita usa ",        style: "italic", weight: 400 },
  { t: "Musculoskeletal Assessment.", style: "italic", weight: 400 },
  { t: " e as vezes ",          style: "italic", weight: 400 },
  { t: "enfatiza",              style: "italic", weight: 700 },
  { t: " dentro da citacao.",   style: "italic", weight: 400 }
]
```

Os cinco pedaços saem com `fontStyle: italic` — o marcado e os não marcados. O
pedaço que pedia ênfase tem **exatamente o mesmo estilo** do texto à volta:
`italic` / 400 contra `italic` / 400. Na tela não há diferença nenhuma. O
negrito, esse, distingue-se (700 contra 400).

A marcação deixou de aparecer crua, que era o defeito principal, e nenhum
sublinhado sobrou. Mas dentro de uma citação o itálico **não informa nada** — e
numa citação bibliográfica, que é o caso que justifica esta tarefa, é justamente
o título da obra que se perde.

**Sugestão:** dentro de `citacao`, inverter — pedaço `italico` vira
`fontStyle: "normal"`. Num bloco já itálico, o texto direito é o que salta. É
uma linha no `TextoComMarcacao`, passando o contexto do bloco.

---

## 4.2 e 4.3 — o que não pode virar formatação

Medido na mesma tela, sobre o texto visível:

| caso | entrada | **na tela** | virou itálico? |
|---|---|---|---|
| `snake_case` no parágrafo | `O campo snake_case` | `O campo snake_case` | **não** |
| `campo_id` no parágrafo | `e o campo_id` | `e o campo_id` | **não** |
| `snake_case` no item de lista | `e com snake_case no mesmo lugar` | um único pedaço `normal` | **não** |
| asterisco de multiplicação | `3 * 4 * 5` | `3 * 4 * 5` | **não** |
| `_` não fechado | `_isto abre e nao fecha` | literal | **não** |
| `**` não fechado | `**isto tambem` | literal | **não** |

### A contagem que fecha a conta

| caractere | esperado literal | **contado na tela** |
|---|---|---|
| `_` | 4 (`snake_case` x2, `campo_id`, o não fechado) | **4** |
| `*` | 4 (`3 * 4 * 5` = 2, o `**` não fechado = 2) | **4** |

**Nem um a mais, nem um a menos.** Tudo o que devia ser formatação virou
formatação e sumiu; tudo o que devia ser literal ficou.

### O parágrafo não fechado sobreviveu inteiro

```
Marcacao nao fechada: _isto abre e nao fecha, e **isto tambem, e o resto do
paragrafo tem de sobreviver inteiro ate o ponto final.
```

Do primeiro caractere ao ponto final, nada foi engolido. Uma marcação aberta e
não fechada não come o resto do texto — que é o comportamento que um texto
clínico exige, porque fechar por conta própria mudaria o que o autor escreveu.

---

## Erros de console

Nenhum erro vindo da renderização do artigo. Os 4 erros da sessão inteira são a
sonda de login antes de a API subir e três capas apontando para `localhost:3000`
(relatório da T-3, achado 3).

Avisos: dois únicos, ambos do build web (`expo-notifications`,
`props.pointerEvents`).

---

## Falhas e recomendações

Nenhum cenário reprovou.

1. **O itálico não é visível dentro da citação** (detalhado em 4.4). O código
   passa; a tela não mostra. Se alguma citação da clínica vier a trazer um
   título de obra, ele some no meio do resto. Inverter o estilo dentro de
   `citacao` resolve.

2. **Anotação, não defeito:** os quinze pedaços das referências reais têm
   `textDecorationLine: "none"`. Se alguém um dia acrescentar
   `textDecorationLine: "underline"` como forma de marcar ênfase, volta-se ao
   sintoma que esta tarefa acabou de resolver — o sublinhado na tela. Vale
   manter a varredura de `underline` como teste.
