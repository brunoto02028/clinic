# QA — Atividade 096 (o artigo vira material do paciente)

Escrita com o plano, em 28/09/2026. O que não puder ser executado é **"não
executado"**, nunca "passou".

## O ambiente

- Dev server em porta própria, confirmada como este checkout. Se houver outro QA
  em paralelo, valem as cinco regras de
  [095/qa/como-rodar.md](../../095-ajustes-para-publicar/qa/como-rodar.md) —
  porta, `.next`, `tsconfig`, cookie por host e o browser do MCP.
- **Nunca logar nem semear em paciente real.** Paciente de teste identificado.
- Em produção existem **35 artigos publicados** e **zero** conteúdos
  educacionais: o estado "vazio" é o estado real, e vale medi-lo.

## T-1 — As duas línguas

| # | passos | esperado |
|---|---|---|
| 1.1 | material com EN e PT, paciente `en-GB` | vê o inglês |
| 1.2 | o mesmo, paciente `pt-BR` | vê o português |
| 1.3 | material **só** com EN, paciente `pt-BR` | vê o inglês, não um espaço vazio |
| 1.4 | o editor do painel | mostra e salva as duas versões |
| 1.5 | material antigo, de antes da mudança | continua aparecendo como antes |

## T-2 — A ponte

| # | passos | esperado |
|---|---|---|
| 2.1 | importar um artigo bilíngue | vira material com as duas línguas |
| 2.2 | conferir o artigo depois | **inalterado** |
| 2.3 | importar o mesmo artigo de novo | atualiza o existente; **não** cria um segundo |
| 2.4 | editar o artigo e voltar ao painel | avisa "o artigo mudou desde a importação" |
| 2.5 | o aviso, sem clicar em nada | o material **não** mudou sozinho |
| 2.6 | artigo sem imagem | material sem thumbnail, sem erro |
| 2.7 | material escrito à mão | continua funcionando, sem origem |

**A que mais importa:** 2.3 e 2.5. Duplicar parte o progresso do paciente entre
duas cópias; atualizar sozinho troca o texto debaixo de quem está lendo.

## T-3 — Liberado para quem você escolher

| # | passos | esperado |
|---|---|---|
| 3.1 | material restrito, paciente **sem** atribuição | não aparece na lista |
| 3.2 | o mesmo, pedindo pelo id | **404** — não 403 |
| 3.3 | material restrito, paciente **com** atribuição | aparece, mesmo não publicado |
| 3.4 | material publicado | aparece para todos da clínica |
| 3.5 | tirar a atribuição | some da lista dele |
| 3.6 | e o progresso de leitura | **fica** |
| 3.7 | paciente de **outra clínica** | não vê nada, nem atribuído nem público |
| 3.8 | sessão emprestada (responsável) | vê o material de quem ele cuida |

**A que mais importa:** 3.2 e 3.7. Um material clínico que vaza pelo id, ou
entre clínicas, é o mesmo tipo de falha que já apareceu duas vezes aqui.

## T-4 — A tela de escolher

| # | passos | esperado |
|---|---|---|
| 4.1 | abrir a aba "Dos artigos" | os 35 aparecem, com o estado de cada um |
| 4.2 | importar um | vira material e a linha passa a dizer "importado" |
| 4.3 | importar vários de uma vez | todos, sem duplicar os já importados |
| 4.4 | artigo **não** publicado | não aparece para importar |
| 4.5 | depois de importar | nada foi atribuído a ninguém |
| 4.6 | quem não pode publicar artigo | não consegue importar |

## T-5 — A tela do app

| # | passos | esperado |
|---|---|---|
| 5.1 | paciente com material atribuído | "Para você" aparece **antes** da biblioteca |
| 5.2 | a atribuição tem nota e prazo | os dois aparecem |
| 5.3 | atribuição obrigatória | o selo aparece |
| 5.4 | marcar como lido | o painel passa a mostrar que leu |
| 5.5 | paciente sem nada atribuído | a tela **diz** que está vazia |
| 5.6 | contraste da ação principal | medido antes e depois, como na 095 T-4 |

**Telas do app dependem de build.** Sem ele, os cenários 5.x são **não
executados**, verificados por código — e ditos como tal.
