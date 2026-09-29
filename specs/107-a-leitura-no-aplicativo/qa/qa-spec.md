# QA — Atividade 107

Regras da casa: paciente de teste, nunca real; confirmar qual checkout serve a
porta; afirmar o status exato; nenhum token no relatório.

Tudo aqui é tela do **aplicativo** — é ali que o paciente lê.

## T-3 — O TODO que chegou ao paciente

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | dados | varrer **o banco**, não os arquivos | nenhum artigo com `TODO`/`FIXME`/`XXX`/`Lorem` |
| 3.2 | UI | abrir no app um protocolo que tinha a linha | as referências acabam numa referência de verdade |
| 3.3 | dados | os onze protocolos | dez perderam uma linha; o décimo primeiro não tinha |
| 3.4 | código | semear de novo num banco limpo | a marca não volta |

O 3.1 é o que importa: corrigir o arquivo não conserta o que o paciente lê.

## T-1 — O cartão

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | UI | lista com os textos reais | imagem na largura do cartão, medida em pixels |
| 1.2 | UI | o título mais longo da clínica | cabe em duas linhas, sem cortar palavra |
| 1.3 | UI | artigo sem imagem | cartão inteiro de texto, sem buraco cinza |
| 1.4 | UI | claro e escuro | contraste medido, não olhado |
| 1.5 | UI | "Required" e "article" juntos | distinguíveis entre si |

## T-2 — O fim do artigo

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | UI | artigo com três irmãos de categoria | três atalhos, sem o atual |
| 2.2 | UI | artigo único na categoria | ou os recentes, ou seção ausente — nunca vazia |
| 2.3 | UI | tocar um atalho | abre o artigo certo |
| 2.4 | UI | caminho de volta | leva à lista |

## T-4 — Markdown no parágrafo

| # | tipo | cenário | esperado |
|---|---|---|---|
| 4.1 | UI | referências de um protocolo | títulos em itálico, **sem** sublinhados na tela |
| 4.2 | unidade | `snake_case` no meio do texto | continua literal |
| 4.3 | unidade | `_` sozinho, `**` não fechado | literal, sem engolir o parágrafo |
| 4.4 | UI | parágrafo, lista e citação | todos formatam igual |
