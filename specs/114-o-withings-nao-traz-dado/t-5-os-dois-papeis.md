# T-5: O aparelho serve os dois papéis

**Status:** implementada (30/09) — QA pendente
**Decidido pelo Bruno em 30/09/2026** — e é uma **reversão consciente** de uma
decisão de 27/09.

## O que ele quer

> *"O medidor de pressão eu quero usar para a clínica e também para mim, como
> paciente meu. Na área da clínica eu quero poder destinar o que é de um paciente
> e o que é meu pessoal, e apagar do meu pessoal as medições que forem de algum
> paciente."*

## A regra

| situação | destino |
|---|---|
| leitura **dentro** de uma sessão de medição aberta | o paciente da sessão |
| leitura **fora** de qualquer sessão | o **dono do aparelho**, automático |

## O que isto reverte, e porquê fica escrito

`lib/clinic-device.ts` diz hoje, com todas as letras, que *sem sessão* **não**
quer dizer *foi o dono* — quer dizer *ninguém disse quem foi*. O atalho foi
derrubado no review de 27/09 porque a pressão de um paciente entrava no
prontuário do dono em silêncio, marcada como medida em casa, e disparava alerta
como sendo dele.

**O Bruno sabe disso e escolheu assim mesmo**, depois de eu levantar o risco
duas vezes. O aparelho é dele e o risco é dele.

O que torna a escolha defensável é a segunda metade do pedido: **poder mover ou
apagar** uma leitura arquivada por engano. Hoje não dá — uma vez arquivada, fica.
Sem essa metade a regra nova seria irreversível, e aí eu não a faria.

## Passos

1. `attributeClinicReading`: sem sessão, se a conta do aparelho também tiver uma
   ligação pessoal cujo dono é paciente desta clínica, arquivar no prontuário
   dele — **marcado** como atribuição automática, e não como "medido em casa".
2. Uma ação de **mover para outro paciente** numa leitura já arquivada, com
   registro de auditoria.
3. Uma lista, na área da clínica, das leituras auto-atribuídas e ainda não
   confirmadas. É por ela que ele limpa.
4. **A decidir:** o alerta de pressão alta espera a confirmação, quando a
   atribuição foi automática? Alertar sobre uma leitura que pode ser de outra
   pessoa é o pior desfecho possível desta regra, e é o ponto em que eu voltaria
   a perguntar.

## Critérios de aceite

- [ ] Sem sessão, a leitura entra no prontuário do dono
- [ ] Dentro de sessão, continua a ir para o paciente da sessão
- [ ] Toda leitura auto-atribuída é **reconhecível** como tal
- [ ] Dá para mover uma leitura arquivada, e fica registrado quem moveu
- [ ] Um teste prova que mover não apaga a leitura — só lhe muda o dono

---

## O que foi feito

### Quem e o dono nao e adivinhado

`lib/dono-do-aparelho.ts`. O dono so existe quando **a mesma conta do provedor**
esta ligada duas vezes: uma como aparelho da clinica, outra como ligacao pessoal
de um paciente daquela clinica. A segunda foi criada **pelo proprio paciente**,
no app — ou seja, alguem disse *"esta conta e minha"*, e e nessa afirmacao que
tudo isto se apoia.

Devolve `null` a qualquer duvida: sem conta do provedor gravada; sem ligacao
pessoal; **mais do que uma** (volta a ser ambiguo); dono que nao e paciente;
dono de outra clinica — este ultimo seria vazamento, e nao atribuicao errada.

### A leitura sem sessao

Vai para o prontuario do dono, com tres cuidados:

| cuidado | porque |
|---|---|
| `autoAttributed: true` | e a marca que permite encontra-la depois. Sem ela a regra seria irreversivel na pratica |
| `context: "OTHER"` | ninguem disse **onde** foi medida. `HOME` seria inventar um facto |
| desfecho `owner`, e nao `assigned` | `assigned` quer dizer *alguem disse de quem era*; isto quer dizer *a regra decidiu, e pode estar errado*. Um `sessionId: ""` faria as duas parecerem iguais |

**A ambiguidade continua a ir para a caixa.** Mais de uma sessao aberta nunca
vira palpite, nem com dono.

### Mover — a metade que torna a regra aceitavel

`POST /api/admin/blood-pressure/[id]/move`.

**Move, nao apaga.** Apagar e recriar perderia o rasto, e a deduplicacao da
sincronia seguinte traria a mesma medida de volta. A leitura muda de dono,
deixa de ser automatica — porque agora **alguem decidiu** — e fica registado
quem moveu.

Duas guardas diferentes: `staffPatientAccess` sobre o paciente **de destino**,
e a leitura de origem tem de ser da clinica de quem move. Sem a segunda, um id
adivinhado deixaria mexer numa leitura alheia.

## Provas

`__tests__/pressao/o-aparelho-serve-os-dois-papeis.test.ts`, 14 cenarios. Por
mutacao, tres: o dono poder ser de outra clinica derruba 1; duas pessoas na
mesma conta deixarem de ser ambiguas derruba 1; a leitura auto deixar de ser
marcada derruba 1.

Suite: **2999 testes**, `tsc` em 0, build ok.

## A porta

A rota sozinha nao servia de nada — o Bruno nao ia chamar uma API. Na aba de
pressao da ficha, cada leitura auto-atribuida mostra um rotulo
*"atribuida automaticamente"* e um botao de mover.

A escolha do destino abre **debaixo da propria leitura**, e nao num dialogo:
mover para o paciente errado e o unico jeito de esta ferramenta piorar as
coisas, e ver os numeros enquanto se escolhe e o que impede isso.

## O que falta

**O `db push` do campo novo.** `autoAttributed` entra no deploy — e o log do
contentor tem de dizer *in sync*, senao a coluna nao existe e a gravacao falha
em silencio.
