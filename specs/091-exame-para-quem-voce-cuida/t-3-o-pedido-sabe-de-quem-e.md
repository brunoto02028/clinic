# T-3: O pedido sabe de quem é o exame

**Status:** código pronto. QA e review pendentes.
**Depende de:** T-7

## O defeito que esta tarefa existe para impedir

O mais silencioso do módulo. O laboratório emite laudo com **faixa de referência por idade**.
Mandar o nome e a data de nascimento da mãe junto da amostra da filha produz um laudo errado com
toda a aparência de certo — ninguém percebe, e o resultado é lido como verdade.

Antes disto, `LabOrder` tinha só `patientId`, e `LabTestRegistration` não tinha identidade nenhuma.
A cadeia inteira assumia que o sujeito **era** o titular.

## O que foi feito

| | |
|---|---|
| `LabOrder.subjectId` | opcional, aponta para `User`, `onDelete: SetNull` |
| `patientOrder().subject` | nome, sobrenome, data de nascimento e idade |
| `identidadeParaOLaboratorio(orderId)` | a função que separa "de quem é a conta" de "de quem é o sangue" |
| checkout | pergunta para quem é, com o titular como padrão |
| a rota | confere o dono **antes** de gravar |

**Opcional, e não obrigatório**, porque nulo significa "do próprio titular" — o sentido de todo
pedido feito antes disto. Um campo obrigatório mudaria o significado do que já está gravado.

**`SetNull`, e não `Cascade`**: remover alguém da conta nunca pode apagar o exame que a LML já
analisou.

### Três cuidados

1. **A checagem de dono vem antes da gravação.** Gravar primeiro e conferir depois deixaria, por um
   instante, um exame apontando para o filho de outra pessoa.
2. **404, não 403.** 403 confirmaria que aquele id existe.
3. **Pessoa desligada não serve de sujeito.** Remover é `deletedAt`, não apagar; sem
   `deletedAt: null` na busca, um exame poderia nascer no nome de quem já saiu da conta.

### Exame de 16+ para criança

`notUnder16` está em dez itens do catálogo. A recusa mora **no servidor**, não na tela: a tela é
sugestão, o servidor é garantia, e nada impede alguém de montar o pedido por fora. A mensagem
nomeia o exame, nas duas línguas — uma frase genérica esconderia qual dos exames é.

## O que não deu para ligar

**Ninguém chama `placeOrder`** ainda: a integração com a LML espera o token (081, T-5 a T-9). Por
isso `identidadeParaOLaboratorio` existe agora — para que, no dia em que alguém a ligar, o caminho
certo já esteja escrito e o errado exija trabalho. Quem for fazer esse wiring: a identidade sai
daqui, nunca de `order.patient`.

## Critérios de aceite

- [x] O pedido aponta para o sujeito, e nulo continua significando "para mim"
- [x] Remover alguém não apaga o exame dela
- [x] A identidade da LML prefere o sujeito, e o titular é a queda
- [x] Dono conferido antes de gravar; 404 para o de outra conta
- [x] Pessoa desligada não serve de sujeito
- [x] Exame 16+ para menor de 16 é recusado pelo servidor, nomeando o exame
- [ ] QA e code review
