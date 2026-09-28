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
