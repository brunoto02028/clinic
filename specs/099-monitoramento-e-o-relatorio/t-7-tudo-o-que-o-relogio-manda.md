# T-7: Tudo o que o relógio manda, e nós não pedimos

**Status:** pendente
**Depende de:** T-1

## O pedido

> *"O mistério aqui é conseguir puxar todas as informações que o relógio fornece
> sem precisar fazer um plano de assinatura. (...) Senão a gente tem que fazer
> um cadastro como clínica dentro da Withings."*

## A resposta, levantada em 01/10/2026

**Não é preciso assinatura, e não é preciso contrato de clínica** para os dados.
Há três coisas diferentes com nomes parecidos, e confundi-las é o que faz
alguém pagar por algo que já tem:

| | o que é | precisamos? |
|---|---|---|
| **Withings+** | assinatura de **consumidor**, dentro do app deles — insights, relatórios | **não**. Não governa a API |
| **Public API** | o que usamos. Qualquer empresa, com o consentimento do utilizador, **sem contrato** | **é o nosso caminho** |
| **Health Solutions / RPM** e **Advanced Research API** | programas para equipas de cuidados e investigação, **com contrato assinado** | **não, para dados** — ver abaixo |

E a lista de dados do próprio documento *Available Health Data* deles diz o que
a Public API expõe para um **ScanWatch 2**:

| família | itens |
|---|---|
| atividade | passos, distância, calorias, intensidade, **treinos** |
| coração | **frequência contínua**, frequência pontual, **VO2 máx**, FC do sono, **HRV** |
| oxigénio | SpO₂ automático e manual |
| temperatura | **temperatura corporal central**, e o resumo da noite |
| sono | duração, **duração por fase** (acordado, leve, profundo, REM), contagem de despertares |
| respiração | **frequência respiratória** |
| ECG | **intervalos QR, PR, QT, QTC**, o **sinal**, **fibrilhação por PPG** e **por ECG** |

**Está tudo lá.** O contrato de clínica (RPM) compra gestão de frota, aparelhos
com SIM e configuração sem telemóvel — não compra tipos de dado que a Public API
não dê. Se um dia a BPR entregar aparelhos a pacientes em lote, aí o RPM passa a
fazer sentido; para ler o relógio de alguém que o ligou, não.

## O que nós pedimos hoje, e o que deixamos na mesa

Ingerimos (`lib/withings.ts`, `lib/withings-vitals.ts`):

- pressão (`measure getmeas`)
- atividade diária (`v2/measure getactivity`)
- **resumo** do sono (`v2/sleep getsummary`)
- SpO2, HRV, temperatura, FC (`getmeas`)
- ECG (`v2/heart list`) — escrito, e **nunca exercido contra resposta real**

Falta pedir:

| o que | endpoint | porque importa |
|---|---|---|
| **série minuto a minuto** de passos e FC | `v2/measure getintradayactivity` | **é a "hora e minuto"**: o gráfico do dia que o app deles mostra. 24h por chamada, 120 chamadas/min |
| **hipnograma** — as fases do sono ao longo da noite | `v2/sleep get` | hoje temos só os totais. A forma da noite é o que se lê, não a soma |
| **treinos** | `v2/measure getworkouts` | corrida, caminhada, sessão — com duração e FC |
| **VO2 máx, freq. respiratória, temp. central** | `getmeas`, tipos que não pedimos | são `meastypes` que já viriam na mesma chamada |
| **fibrilhação por PPG** | notificação/`v2/heart` | hoje só olhamos o ECG |

## Passos

1. Ampliar a lista de `meastypes` do `getmeas` — VO2 máx, frequência
   respiratória, temperatura central — e guardar nos campos que já existem, ou
   acrescentar os que faltarem, **aditivamente**.
2. `v2/sleep get` para o hipnograma, guardado como série, não como total.
3. `v2/measure getintradayactivity`, respeitando as 24h por chamada e o limite
   de ritmo. **Isto gera muito mais linha que tudo o resto junto** — o modelo
   de hoje é um ponto por dia, e minuto a minuto são 1440. Decidir onde mora
   antes de escrever.
4. `v2/measure getworkouts`.
5. Exercer o caminho do ECG contra resposta real e corrigir o que o palpite
   errou — é o mesmo padrão do cliente da LML, que errava host e caminho por ter
   sido escrito sem documentação.
6. Um teste por formato de resposta, com o corpo real que a API devolveu.

## O que não fazer

**Não puxar minuto a minuto de 90 dias na primeira sincronização.** São 24h por
chamada; noventa dias são noventa chamadas por pessoa, e o limite deles é por
minuto. A janela do intraday é curta por desenho — o dia de hoje e os poucos
anteriores — e o resumo diário continua a ser o que cobre o período longo.

**Não guardar o sinal do ECG como se fosse nosso.** O traçado é um ficheiro do
aparelho; a conclusão é da Withings. Nós mostramos os dois e dizemos de quem
são.

## Critérios de aceite

- [ ] Cada endpoint novo tem um teste com o corpo real que a API devolveu
- [ ] O intraday não rebenta o limite de ritmo, e a janela é explícita
- [ ] Um dia sem dado continua a ser buraco, nunca zero
- [ ] O que não se consegue ler fica registado como **não lido**, não como ausente
- [ ] Nenhum dado novo vira afirmação clínica na tela do paciente
