# T-6: A ficha mostra o estado da ligação

**Status:** implementada (30/09) — QA pendente

## O que ele pediu

> *"A gente tem que ter como monitorar na área da clínica de cada paciente para
> ter certeza que as conexões estão ativas e sincronizadas. Não podemos perder
> essa conexão do paciente, que isso é muito sério."*

## O que já existia — e foi bom ter procurado antes

`/admin/biohacking` **já lista** todos os pacientes com o estado de entrega
(`receiving`, `partial`, `silent`) e há quantos dias cada ligação está calada. E
está no menu.

A aba de pressão da ficha **já avisava** quando havia medições à espera de
atribuição, com o caminho para a caixa.

O que faltava era o estado da ligação **onde o terapeuta olha de facto**: a ficha
do paciente não dizia uma palavra sobre o aparelho.

## O que foi feito

`GET /api/admin/patients/[id]/wearables`, e uma linha por ligação na aba de
pressão.

**A linha mostra duas coisas diferentes de propósito**, porque é a confusão entre
elas que fazia tudo parecer saudável:

| campo | responde |
|---|---|
| `delivery` | a Withings **prometeu** avisar? |
| `lastReadingAt` | quando chegou dado, de facto |
| `lastSyncedAt` | quando falámos com eles — acontece com ou sem dado |

A linha **nunca diz apenas "conectado"**. Diz *a receber · última leitura: X*, ou
*sem receber há N dias — pode ser preciso reconectar*.

O limiar de silêncio vem da regra da clínica (`WEARABLE_SILENCE`) e viaja na
resposta, para a tela não inventar um número próprio. E usa o `isSilent` que já
existia — que isenta o `DISCONNECTED`, porque quem desligou sabe que não vai
receber, e **não** isenta o `ERROR`, que é justamente o estado que precisa de
aparecer.

## Critérios de aceite

- [x] A ficha mostra o estado de cada ligação do paciente
- [x] Nunca diz "conectado" sozinho — sempre com a data da última **leitura**
- [x] O limiar é o da clínica, e não um número da tela
- [ ] QA na tela, nas duas línguas
