# Pai ou mãe pedindo exame para um filho — achado de 27/09/2026

Pedido do Bruno: deixar claro no app que um responsável pode pedir exame para um filho.

**Conferi antes de escrever texto, e o texto é a última etapa, não a primeira.** Hoje o sistema diz
o contrário disso em três camadas, e a camada mais barata de mudar é justamente a única que não
resolve nada.

---

## 1. O consentimento inteiro está escrito na segunda pessoa

Não é só a linha da idade. Em `lib/lab-consent.ts`, praticamente toda cláusula assume que **quem
pede é quem é examinado**:

| cláusula | como está | o que quebra no caso do filho |
|---|---|---|
| idade | "Laboratory tests are for people aged 16 or over." | proíbe exatamente o caso |
| quem analisa | "recebe **seu** nome, data de nascimento, endereço" | os dados que vão para a LML são os do filho, não os do pai |
| o resultado | "O resultado é **seu**. Ele chega a **você**" | o resultado é do filho e chega ao responsável |
| a coleta | "A coleta é **sua**" | quem coleta é o responsável, na criança |
| apagar | "**você** pode pedir para apagarmos" | quem pede é o responsável |

Trocar só a linha da idade deixaria um documento que se contradiz em cinco pontos — e
consentimento que se contradiz não é consentimento.

## 2. O banco não tem onde guardar "de quem é este exame"

```
LabOrder            → patientId (o titular da conta), shippingName/Address/Postcode (só entrega)
LabTestRegistration → nenhuma identidade: sem nome, sem data de nascimento
```

A cadeia toda assume que o sujeito **é** o titular: a data de nascimento que a LML recebe sai de
`User.dateOfBirth`, que é a do pai.

**Consequência hoje, se um pai pedisse:** a amostra do filho seria registrada com o nome e a idade
do pai. O laudo voltaria arquivado no prontuário do pai, com faixa de referência de adulto. Isso é
resultado atribuído à pessoa errada em registro clínico — é o defeito mais grave que este módulo
poderia ter, pior do que não oferecer o recurso.

## 3. A regra de idade não é nossa

Já está escrito no código, em `lib/lab-consent.ts:56`:

> `// 16, decisão do Bruno em 26/09/2026. Se as condições da própria LML exigirem 18, este número tem de subir junto — e o texto deles vence.`

**Só a London Medical Laboratory decide se aceita amostra de menor e a partir de que idade.** Muito
laboratório particular do Reino Unido recusa pediátrico, ou aceita com regra própria de coleta. Eu
não tenho como saber: o acesso à API deles ainda está pendente de token (atividade 081, T-5 a T-9).

---

## O que eu recomendo

Construir a estrutura agora — ela é a modelagem honesta e é necessária de qualquer jeito — e
**manter desligada até a LML confirmar**, do mesmo jeito que `LAB_ORDERING_ENABLED` já fecha a
compra hoje.

O que a estrutura precisa ter:

1. **Dependente é registro, não usuário.** Tabela própria ligada ao titular (nome, data de
   nascimento, parentesco). Sem login, sem senha, sem acesso — para não existir a possibilidade de
   uma criança receber resultado de exame sozinha.
2. **O pedido aponta para o sujeito.** `LabOrder` ganha de quem é o exame: o próprio titular ou um
   dependente dele.
3. **A LML recebe os dados do sujeito**, não os do titular — nome e data de nascimento do
   dependente na registração do kit.
4. **O consentimento passa a ter duas versões:** para si, e em nome de um dependente — esta última
   registrando quem consentiu, por quem e quando. Consentimento de responsável é registro, não
   caixinha marcada.
5. **O resultado arquiva sob o dependente** e é visível ao responsável.

Só depois disso o texto no app faz sentido. **Escrever a frase antes de a LML confirmar é o pior
resultado possível:** um pai lê "dá para pedir para seu filho", paga, coleta na criança, e o
laboratório recusa a amostra.

## O que eu preciso de você

Uma coisa só, e ela é externa: **perguntar à LML se aceitam amostra de menor e a partir de que
idade** (e se há regra própria de coleta pediátrica). A resposta deles define o número e se o
recurso existe.

O que **não** preciso perguntar: se o titular tem de ser adulto. Tem. A criança é sujeito, nunca
usuária.
