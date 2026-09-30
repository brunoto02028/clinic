# T-5: O aparelho serve os dois papéis

**Status:** pendente
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
