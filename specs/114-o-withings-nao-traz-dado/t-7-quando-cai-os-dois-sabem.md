# T-7: Quando a ligação cai, os dois sabem

**Status:** metade feita (30/09) — o lado da clinica esta pronto; falta o aviso dentro do app

## O que ele pediu

> *"Se cair a conexão da API na conta do paciente, precisa aparecer uma
> notificação para o paciente e para a clínica dizendo que a conexão foi perdida
> e que ele precisa reconectar. Se a clínica conseguir reconectar, ok. Agora se
> precisar de senha do paciente, é só o paciente pelo aplicativo que consegue."*

E, no mesmo fôlego, o que mais importa:

> *"O estado da ligação não pode ser falso. Não pode ter uma luz verde dizendo
> que está conectado quando a verdade não está."*

## A luz verde falsa

É o ponto central, e tem nome: hoje `status: "CONNECTED"` é um campo que
escrevemos **no dia em que a pessoa ligou**, e nunca mais. Ele não sabe nada
sobre hoje.

Três perguntas diferentes, e só as duas últimas são honestas:

| o que se olha | o que prova |
|---|---|
| `status` | que alguém ligou, um dia. **Nada sobre agora.** |
| `delivery` | que perguntámos à Withings e ela respondeu que vai avisar |
| `lastReadingAt` | que chegou dado, de facto |

A **T-3** fez `delivery` deixar de ser uma resposta única na vida — era
confirmada uma vez e nunca mais. A **T-6** pôs as duas últimas na ficha do
paciente. Falta a tela do paciente, que é onde a luz verde ainda está — e essa é
a **T-2**.

## Como se verifica de verdade

1. **Perguntar à Withings** — o `list` das assinaturas, que é o que
   `subscribeAndRecord` faz, agora a cada 12 horas. Uma assinatura que caiu
   aparece aqui.
2. **Refrescar o token** — se o refresh falha, a ligação está partida. É uma
   resposta concreta, não uma suposição.
3. **Olhar a última leitura**, com o limiar da clínica.

Nenhuma das três sozinha basta: a 1 pode estar boa com o aparelho fora da
tomada; a 3 pode estar calada porque a pessoa viajou. É por isso que a tela tem
de mostrar **o que sabe**, e não um verde resumido.

## Quem avisa quem

- **Paciente:** aviso **dentro do aplicativo** — na tela de dispositivos e na
  entrada — com o botão de reconectar. **Não é envio automático de mensagem**:
  vale a regra da casa de nunca enviar a paciente sem o Bruno ver.
- **Clínica:** na ficha e no painel, e e-mail à clínica, que é um caminho já
  automático para alertas.
- **Reconectar:** a clínica tenta; quando for preciso a senha da conta Withings,
  só o paciente consegue, pelo app — e a tela tem de **dizer isso**, em vez de
  deixar o terapeuta a tentar uma coisa que não vai funcionar.

## Critérios de aceite

- [ ] Nenhuma tela mostra "conectado" a partir do `status` sozinho
- [ ] O paciente vê o aviso no app, com o caminho para reconectar
- [ ] A clínica vê na ficha e é avisada
- [ ] Está escrito, na tela, quando só o paciente pode resolver
- [ ] Um teste prova que uma ligação com assinatura caída **não** aparece verde

---

## O lado da clinica: feito

`lib/wearable-caiu.ts`, chamado no fim de cada conexao no cron.

### Duas maneiras de cair, e nao sao a mesma noticia

| motivo | o que significa | quem resolve |
|---|---|---|
| **nao entrega** (`silent`, `partial`, `unchecked`) | o provedor nao esta a avisar — assinatura caida, autorizacao expirada | pode precisar da senha, e ai **so o paciente**, pelo app |
| **calada** (`receiving` e nada ha dias) | a promessa esta em dia; o aparelho e que nao mede | o paciente, fisicamente — tomada, bateria, habito |

Separa-las importa porque **o conselho e diferente**. Um aviso que manda
reconectar um aparelho que esta perfeitamente ligado gasta a paciencia de quem o
le, e da terceira vez ninguem le mais.

O e-mail diz qual dos dois e, e diz explicitamente quando so o paciente pode
resolver.

### Porque um `Alert`, e nao um e-mail direto

A clinica ja tem a tela de "coisas que precisam de atencao", e os alertas de
pressao ja passam por ali. `createAlert` deduplica pelo dia e devolve
`created: false` quando o alerta de hoje ja existia — **e e isso que impede o
cron, que corre de duas em duas horas, de mandar doze e-mails por dia sobre a
mesma ligacao muda.**

O codigo da regra e `WEARABLE_DISCONNECTED`, e **nao** `WEARABLE_SILENCE`:
partilhar a string faria o interruptor do limiar desligar o alerta junto. Um
teste cobra que sejam diferentes.

### A releitura antes de julgar

`ingestWithings` acabou de escrever `lastReadingAt`, e o objeto em memoria ficou
velho. Julgar o silencio pelo valor antigo marcaria como muda uma ligacao que
acabou de entregar — o mesmo tipo de erro que a rotacao de token ja tinha
causado neste arquivo.

## Provas

`__tests__/wearables/quando-a-ligacao-cai.test.ts`, 11 cenarios sobre a
**decisao**, que e a parte que erra em silencio. Por mutacao, tres: o parcial
deixar de contar derruba 2; o silencio deixar de contar derruba 4; voltar a
avisar quem desligou derruba 1.

## O que falta

**O aviso dentro do app.** A tela de dispositivos ja mostra o estado e ja tem o
botao de reassinar — mas a pessoa tem de la ir. Falta trazer isso para onde ela
passa: a entrada do app.

**Nao e envio automatico de mensagem** — e a tela a mostrar o que sabe. A regra
da casa de nunca enviar a paciente automaticamente continua de pe.
