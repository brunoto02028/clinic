# QA — Atividade 086 (claro e escuro)

## T-1 — Paleta, preferência e escolha

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | UI | Abrir Minha conta | seção **Aparência** com dois botões, o atual destacado |
| 1.2 | UI | Tocar em Escuro | **toda** a tela repinta na hora, sem remontar |
| 1.3 | UI | Fechar e reabrir o app | volta no tom escolhido, sem piscar claro antes |
| 1.4 | UI | Seletor de áreas no escuro | fundo `#191C23`, texto bone, **nenhum** elemento claro |
| 1.5 | UI | Seletor de áreas no claro | fundo bone, texto ink, logo em `ink` |
| 1.6 | UI | Barra de status | conteúdo claro no escuro, escuro no claro |
| 1.7 | código | Paleta escura | define **todos** os tokens do claro |
| 1.8 | UI | Contraste no escuro | texto de apoio legível sobre superfície (alvo 4,5:1) |
| 1.9 | UI | As duas línguas | "Aparência / Claro / Escuro" e "Appearance / Light / Dark" |
| 1.10 | shell | `app.json` | **inalterado** — este trabalho não pede build |

## T-2 — Varredura (quando for feita)

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | UI | Cada tela da lista, no escuro | nenhum texto ilegível, nenhuma faixa clara |
| 2.2 | UI | Acentos de marca | preservados onde forem decisão, e não acidente |

## QA online

Não se aplica: é tudo do app, e chega por `eas update`.
