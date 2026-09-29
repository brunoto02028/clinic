# T-4: O que fazer com o que assusta

**Status:** pendente
**Depende de:** T-3

## Objetivo

Decidir — e escrever — o que acontece quando o número é ruim.

Esta é a tarefa mais importante da atividade e a que menos tem código.

## As decisões do Bruno, 29/09/2026

Ele mudou o desenho que eu tinha proposto, e para melhor. Nas palavras dele:

> *"Todas as medições de pressão dentro do app, temos que dar o alerta,
> obviamente, para o paciente, e o paciente tem que encaminhar para o médico de
> preferência dele. A gente está apenas informando e acompanhando. Porque às
> vezes a pessoa está fazendo isso e não é nem paciente da clínica. (…) O
> paciente também vai dando a ação dentro do app, que ele está ciente daquelas
> medições, que ele está buscando ajuda, está em tratamento, tomando algum tipo
> de medicação com acompanhamento médico. Essa ação do paciente, para não ficar
> alertando o tempo todo, é importante."*

Três coisas saem daí, e cada uma muda o código:

### 1. O paciente **é** avisado — e isso não contradiz a regra da casa

A regra de 17/09/2026 é que nada sai para paciente **por decisão do sistema**
sobre o tratamento dele. Aqui é diferente: é **o dado dele**, medido no corpo
dele, e a mensagem não propõe tratamento nenhum — ela diz para procurar o médico
**dele**.

Guardar isso da pessoa seria pior: ela comprou um aparelho para saber.

### 2. A clínica **informa e acompanha; não trata**

O texto nunca diagnostica e nunca sugere conduta. Ele aponta o número, diz que
está fora da faixa de referência, e manda procurar o médico de preferência dela.

Isso vale inclusive para quem **não é paciente da clínica** — e é por isso que a
frase não pode ser "fale com a gente".

### 3. A ação do paciente encerra o alarme

Esta é a peça que eu não tinha pensado, e é o que separa cuidado de perseguição.

Depois de avisado, o paciente registra no app o que fez:

| o que ele marca | o que acontece |
|---|---|
| "Estou ciente" | o aviso para de repetir para aquela faixa |
| "Procurei um médico" | idem, e a clínica vê que ele procurou |
| "Estou em tratamento / tomando medicação com acompanhamento" | o app para de alertar para valores dentro do esperado de quem trata, e a clínica sabe o contexto ao ler o gráfico |

Sem isso, um aparelho que mede quarenta vezes por dia vira quarenta alarmes — e
alarme repetido é alarme ignorado. **Alerta que não pode ser respondido vira
ruído, e ruído esconde o próximo alerta de verdade.**

## As faixas — NICE NG136

Confirmado com o Bruno em 29/09/2026, e a sutileza é a razão de existir esta
seção: **leitura de bracelete usa limiares 5 mmHg mais baixos que os de
consultório**, porque mede fora do efeito do jaleco branco.

| | consultório | **bracelete / casa** (média diurna) |
|---|---|---|
| Normal | < 140/90 | **< 135/85** |
| Estágio 1 | 140/90 – 159/99 | **135/85 – 149/94** |
| Estágio 2 | 160/100 – 179/119 | **≥ 150/95** |
| Grave | ≥ 180/120 | encaminhamento no mesmo dia |

Usar os números de consultório faria quase toda leitura de bracelete parecer
normal — e alguém em estágio 1 passaria sem nada acender.

O NICE também exige, para a média diurna valer: **pelo menos 2 medições por
hora** nas horas acordado, e a média de **no mínimo 14 leituras**. Isso é regra
no código: um dia com poucas leituras não gera alerta nenhum.

Fonte: [NICE NG136](https://www.nice.org.uk/guidance/ng136/chapter/recommendations).

## Passos

1. As faixas acima em `lib/pressao-continua.ts`, com a fonte no comentário.
2. Um dia só vira faixa se satisfizer o mínimo do NICE — senão é "dados
   insuficientes", e ninguém é alertado.
3. O aviso ao paciente: texto que **nunca** é um número solto, que diz a faixa
   em palavras, e que manda procurar o médico dele.
4. O registro da ação do paciente — ciente / procurei / em tratamento — com data,
   e o silenciamento que vem dele.
5. O sinal para a clínica na fila da 103 T-2, com o que o paciente respondeu.
6. Reabrir o alarme quando a faixa **piora**: quem marcou "em tratamento" no
   estágio 1 e foi para o estágio 2 precisa ser avisado de novo.
7. No material: isto não é diagnóstico, não é aferição, e não é emergência.

## Arquivos afetados
- `lib/pressao-continua.ts`
- `prisma/schema.prisma` (a ação do paciente)
- `mobile/app/(app)/(clinica)/blood-pressure.tsx`
- a fila de pendências da 103 T-2
- `__tests__/wearables/o-que-fazer-com-o-que-assusta.test.ts`

## Critérios de aceite
- [ ] As faixas são as do NG136 para medição fora do consultório, com a fonte.
- [ ] Dia sem o mínimo de leituras **não** alerta.
- [ ] O texto ao paciente nunca é um número solto e sempre aponta o médico dele.
- [ ] O texto nunca diagnostica nem sugere conduta.
- [ ] A ação do paciente silencia a repetição, e fica registrada com data.
- [ ] Piorar de faixa **reabre** o aviso, mesmo com ação registrada.
- [ ] A clínica vê o que o paciente respondeu.
- [ ] O material diz que não é diagnóstico, aferição nem emergência.
