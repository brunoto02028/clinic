# QA — Atividade 099 (monitoramento e o relatório)

Escrita com o plano, em 28/09/2026. O que não puder ser executado é **"não
executado"**, nunca "passou".

## Ambiente

- **Paciente de teste identificado**, com o ScanWatch ligado **nele** e em mais
  ninguém. Ver a armadilha da conta no plano.
- Depois do deploy, conferir `in sync` no log do contêiner — T-5 mexe no schema.
- **Nenhum número de saúde real de paciente real neste relatório.** Os
  exemplos usam o paciente de teste.

## T-1 — O que o ScanWatch traz

| # | cenário | esperado |
|---|---|---|
| 1.1 | tabela `dataType` gravado × tela que mostra | nenhuma linha sem tela |
| 1.2 | um ECG feito no relógio | aparece com data e conclusão do aparelho |
| 1.3 | o traçado | **não** aparece em lugar nenhum |
| 1.4 | fibrilação detectada | destaque no painel, não um número no meio |
| 1.5 | mesma conta Withings em duas contas de paciente | a tela avisa |

**A que mais importa:** 1.5. É a armadilha do teste do Bruno, e ela é silenciosa.

## T-2 — A tela do paciente

| # | cenário | esperado |
|---|---|---|
| 2.1 | 7, 30 e 90 dias | funcionam; 30 é o padrão |
| 2.2 | **noite sem o relógio no pulso** | buraco no gráfico, **não** zero |
| 2.3 | a variação | em palavras, nas duas línguas |
| 2.4 | paciente sem aparelho | tela que explica, não gráfico vazio |
| 2.5 | semáforo de normal/anormal | **não existe** |

## T-3 — O painel

| # | cenário | esperado |
|---|---|---|
| 3.1 | mudar o período | muda todas as séries juntas |
| 3.2 | métrica sem dado | "sem dado", não some |
| 3.3 | paciente de outro tenant | 404 |
| 3.4 | botão Gerar relatório | leva com o período escolhido |

## T-4 — O relatório

| # | cenário | esperado |
|---|---|---|
| 4.1 | paciente com tudo | as cinco seções, com datas |
| 4.2 | paciente sem wearable | a seção de sinais **não aparece** |
| 4.3 | leitura do texto inteiro | **nenhuma frase conclui algo clínico** |
| 4.4 | trecho do terapeuta | sai com o nome dele |
| 4.5 | PDF | continua saindo, com as seções novas |
| 4.6 | paciente novo, sem nada | relatório curto e honesto |

**A que mais importa:** 4.3. É a linha entre um resumo e um diagnóstico
automático.

## T-5 — A automação

| # | cenário | esperado |
|---|---|---|
| 5.1 | plano sem cadência | nada gerado, e a tela do app **não aparece** |
| 5.2 | plano semanal | gera no vencimento |
| 5.3 | rodar a tarefa duas vezes | **não** duplica |
| 5.4 | **os avisos, com o interruptor desligado** | **nenhum push, nenhum e-mail** |
| 5.5 | interruptor ligado pelo paciente | o aviso chega |
| 5.6 | botão do painel | dispara naquele clique, e diz em quantos aparelhos |
| 5.7 | desligar a cadência | para de gerar, **não apaga** os antigos |

**A que mais importa:** 5.4. É a regra de 17/09 inteira, e ela precisa ser
verificada olhando o log de envio, não a tela.

## T-6 — O desvio

| # | cenário | esperado |
|---|---|---|
| 6.1 | FC de repouso 48 em quem vivia em 70 | desvio |
| 6.2 | FC de repouso 48 em quem vive em 50 | **não** é desvio |
| 6.3 | paciente com três dias de histórico | não gera desvio |
| 6.4 | fibrilação detectada | aparece sem depender de média |
| 6.5 | o paciente | **não recebe nada** |
| 6.6 | marcar como visto | guarda quem viu e quando |

## T-7 — Tudo o que o relógio manda (acrescentada em 01/10/2026)

**Nota de ambiente:** a conta do Bruno tem **duas ligações** — a braçadeira da
clínica e o relógio. Elas partilham a conta, e foi isso que causou o `601` que
esta tarefa conserta. Qualquer QA aqui tem de olhar as duas.

| # | cenário | esperado |
|---|---|---|
| 7.1 | rodar a sincronização duas vezes seguidas | **nenhum `601`** no log; `failed: 0` |
| 7.2 | o log depois de uma rodada | se houver tipo de medida sem nome, ele aparece com número e contagem |
| 7.3 | forçar erro numa das três séries (ex.: campo inválido) | **as outras duas entram na mesma** — o log nomeia só a que falhou |
| 7.4 | `WearableSeries` depois da rodada | um registo por dia e tipo, `pointCount` batendo com a série |
| 7.5 | rodar duas vezes | o registo do mesmo dia é **substituído**, não duplicado |
| 7.6 | pressão medida na braçadeira | chega ao sistema (é o que o `601` impedia) |

## T-8 — A página de saúde

| # | cenário | esperado |
|---|---|---|
| 8.1 | abrir a tela com dados do dia | o gráfico de 24h aparece, com as horas no eixo |
| 8.2 | **hora sem leitura** | traço fino na base — **nunca** barra de altura zero |
| 8.3 | **hora que ainda não chegou** (ver hoje de manhã) | espaço vazio, **visivelmente diferente** de 8.2 |
| 8.4 | ver um dia passado | nenhuma hora marcada como futuro |
| 8.5 | a legenda do gráfico do dia | diz que a barra é por hora e a leitura é de 5 em 5 minutos |
| 8.6 | a noite | as fases aparecem ao longo do tempo, com hora de deitar e acordar |
| 8.7 | os totais da noite | profundo/REM/leve/acordado somados, e **acordado conta** |
| 8.8 | despertares | deitar e acordar **não** contam |
| 8.9 | **nenhuma cor de nota** | nenhum valor em verde/âmbar por faixa de referência |
| 8.10 | nenhuma palavra proibida | sem "normal", "alterado", "diagnóstico" |
| 8.11 | paciente sem aparelho | tela que explica, não gráfico vazio |
| 8.12 | EN e PT | os dois, inglês primeiro |
| 8.13 | 90 dias carregados | a tela abre sem travar |

**O que não dá para testar sem dado real:** se a Withings não devolver intraday
ou hipnograma para a conta, 8.1 a 8.8 ficam **não executados** — e isso tem de
ser dito como "não executado", não como "passou". A diferença entre *"a API não
devolveu"* e *"o nosso plano não inclui"* só se vê no erro, e o erro deles para
dado fora do plano é **ausência silenciosa**.
