# Atividade 105 — A pressão o dia inteiro: o bracelete da paciente

## Objetivo

> O Bruno, 29/09/2026: *"a paciente Mione está usando esse bracelete [Hilo] para
> fazer a medição de pressão dela o tempo todo. Não sei se a gente consegue API
> para integrar no nosso sistema para que a gente possa monitorar essa paciente
> full time, através do app."*

Trazer a pressão medida o dia inteiro por um bracelete Hilo para dentro do
acompanhamento da clínica.

## A resposta curta: **não existe API do Hilo**

Verifiquei antes de planejar, e é o achado que decide o desenho todo.

O Hilo (antiga **Aktiia**) não publica API para terceiros. O que a empresa
oferece é o **app deles escrevendo no Apple Health (iOS) e no Health Connect
(Android)** — e é de lá que qualquer integração lê. É assim que a Sahha e as
outras plataformas de saúde fazem.

Existe um cliente não-oficial em código aberto (`antirez/bplog`) que fala com a
API privada da Aktiia. **Não serve**: é engenharia reversa de uma API sem
contrato, que quebra quando eles quiserem, com credencial de paciente guardada
por nós. Para dado clínico de uma pessoa real, isso não se faz.

E há um terceiro caminho, que é o que a Aktiia está vendendo: a tecnologia
**CALFREE** licenciada para fabricantes. Não é para nós — é para quem fabrica
aparelho.

## O caminho que sobra, e ele é bom

**Ler do Apple Health e do Health Connect, pelo app do paciente.**

Isso tem uma vantagem grande sobre uma API do Hilo, se existisse: **funciona para
qualquer aparelho**. Apple Watch, Omron, Withings, Hilo — tudo que escreve
pressão na saúde do telefone entra pelo mesmo cano. A clínica deixa de depender
de cada fabricante ter API.

E o sistema já tem metade disso: `BloodPressureReading` com `source`
(`PATIENT_DEVICE`, `CLINIC_DEVICE`, `MANUAL`), a tela de pressão no app, os
gráficos e os relatórios de monitoramento da 099.

## O preço, dito antes de você decidir

Isto **não é `eas update`**. Ler saúde do telefone é capacidade nativa:

- **iOS**: entitlement HealthKit, e a Apple exige justificativa clínica na
  revisão. A memória da casa já registra que **capacidade nova invalida o
  provisioning** e derruba o build até regenerar o perfil.
- **Android**: permissões do Health Connect, e a política de dados de saúde do
  Google Play — a mesma seção que a ficha da loja vai declarar.
- **Build novo nas duas lojas.** O aparelho da Mione só passa a mandar dado
  depois de instalar a versão nova.

Nada disso é impeditivo. É prazo, e é melhor saber agora.

## Tarefas

| T-N | nome | status |
|---|---|---|
| T-1 | [O telefone entrega a pressão](t-1-o-telefone-entrega-a-pressao.md) | pendente |
| T-2 | [Muitas medidas por dia não é a mesma coisa que três](t-2-muitas-medidas-por-dia.md) | pendente |
| T-3 | [A clínica vê o dia, não só o ponto](t-3-a-clinica-ve-o-dia.md) | pendente |
| T-4 | [O que fazer com o que assusta](t-4-o-que-fazer-com-o-que-assusta.md) | pendente |

## Decisões de design

### 1. A fonte é o telefone, não o fabricante

Um provedor por fabricante é uma corrida sem fim. O telefone já é o ponto onde
todos eles se encontram, e a pessoa já consentiu ali uma vez.

**E isso responde à pergunta do Bruno sobre os outros fornecedores** — Withings,
biohacking, o que vier: **uma capacidade cobre todos**. Não há o que prever por
fabricante antes da publicação; há **uma** coisa a incluir no build, que é a
leitura da saúde do telefone. A Withings continua pelo caminho dela, servidor a
servidor, que já funciona e não depende de build.

### 2. Medida contínua não é medida de consultório

Um bracelete mede dezenas de vezes por dia, inclusive dormindo. Tratar isso como
a medição do aparelho da clínica enche o prontuário de ruído e esconde o que
importa. O valor está na **tendência**, na **variação** e na **noite** — não em
cada ponto.

### 3. O paciente **é** avisado — e ele responde (decidido em 29/09/2026)

Eu tinha proposto o contrário, e o Bruno corrigiu:

> *"Temos que dar o alerta, obviamente, para o paciente, e o paciente tem que
> encaminhar para o médico de preferência dele. A gente está apenas informando e
> acompanhando. (…) O paciente também vai dando a ação dentro do app, que ele
> está ciente, que está buscando ajuda, está em tratamento. Essa ação, para não
> ficar alertando o tempo todo, é importante."*

Isso **não** contraria a regra de 17/09/2026. Aquela regra é sobre o sistema
decidir sozinho algo do **tratamento** da pessoa. Aqui é o dado dela, medido no
corpo dela, e a mensagem não propõe conduta — manda procurar o médico **dela**.
Guardar isso seria pior: ela comprou o aparelho para saber.

E a ação do paciente é a peça que eu não tinha pensado: **alerta que não pode
ser respondido vira ruído, e ruído esconde o próximo alerta de verdade.**

### 4. A clínica informa; não trata

Vale inclusive para quem **não é paciente da BPR** — e é por isso que o texto
nunca diz "fale com a gente", e sim "procure o seu médico".

### 5. Isto não é diagnóstico, e o texto tem de dizer

Leitura de bracelete não substitui aferição. O app já tem o aviso de "não é
serviço de emergência" da 074 — este material segue a mesma linha.

## Suposições — para você validar

1. **A Mione instala a versão nova do app** e autoriza a leitura de pressão. Sem
   isso não há caminho — nem com API do Hilo haveria, porque a conta é dela.
2. **A clínica quer ver tendência e noite**, não cada uma das dezenas de
   leituras diárias.
3. **Nada é apagado**: as leituras contínuas entram ao lado das do aparelho da
   clínica, distinguíveis pela `source`, e não no lugar delas.
4. **Começa por ela.** Uma paciente, um aparelho, até o fluxo provar que serve.
5. ~~Sem alerta automático~~ — **revisto pelo Bruno em 29/09/2026**: o paciente
   é avisado, sempre apontando o médico dele, e a ação dele encerra a repetição.
   Ver a decisão 3 e a T-4.
6. **As faixas são as do NICE NG136 para medição fora do consultório** — 5 mmHg
   abaixo das de consultório —, e um dia só conta com o mínimo de leituras que o
   NICE exige.
