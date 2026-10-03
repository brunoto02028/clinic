# O fluxo: ligar o BeamO, e a medição ir ao paciente certo

**Escrito em 03/10/2026**, na véspera de o aparelho chegar. É a referência para
amanhã de manhã.

## O que já é verdade hoje

A tua conta Withings — `49651552` — **já está ligada a nós duas vezes**:

| ligação | para quê |
|---|---|
| **pessoal** | o que é teu: passos, sono, ECG do relógio, VFC |
| **da clínica** | a autoridade sobre o que é medido **noutra pessoa** |

É esse par que torna possível um aparelho servir os dois papéis. O BeamO entra
nessa mesma conta, no Health Mate, como mais um aparelho. **Do nosso lado não há
nada a ligar**: nós ligamo-nos à conta, não ao aparelho.

## Passo 0 — reconectar o aparelho da clínica (**bloqueante**)

A autorização do aparelho da clínica morreu por volta de 24/09 — o token
expirou e só uma nova autorização o repõe.

> **Nota do QA:** `status: "ERROR"` só passou a ser escrito em 03/10. Uma ligação
> que morreu antes disso continua marcada `CONNECTED`, e nesse estado a tela
> desenhava o botão de medir como se nada fosse — a medição abriria uma janela
> que nunca receberia leitura nenhuma. Por isso a pergunta deixou de ser feita ao
> `status` e passa a ser feita à **mensagem de erro**, com a mesma régua que o
> resto do sistema usa. Nos dois casos, agora:

- **não há botão de medir** na ficha do paciente — hoje ele desaparecia sem
  dizer porquê, e isso ficou corrigido: passa a aparecer um aviso âmbar
  *"O aparelho da clínica precisa ser reconectado antes de medir um paciente"*
  com o link;
- sem janela de medição, **nada pode ser atribuído a um paciente**.

Onde: **Pacientes → Caixa de entrada de medições** (`/admin/measurements/inbox`),
botão **Reconectar**. Só tu o podes fazer — é a tua conta.

## Passo 1 — instalar o BeamO no Health Mate

Na **mesma conta** (`49651552`). Um perfil só, como a braçadeira: a Withings não
nos diz qual perfil mediu, e um segundo perfil faz a leitura desaparecer em
silêncio.

Depois do primeiro uso, confirma na caixa de entrada que o aparelho aparece.

## Passo 2 — medir

### Em ti

Mede e pronto. **Não faças nada no sistema** — desde que não haja uma janela
aberta há menos de três minutos.

> **A armadilha, e tem conserto desde hoje:** uma janela que tu abras num
> paciente e não uses **continua a reclamar medições** daqueles três minutos,
> mesmo depois de expirar (é de propósito: a leitura que só sobe horas depois
> não se pode perder). Se abrires e não medires, a tua própria medição a seguir
> entrava na ficha dele. A tela expirada passa a ter **"Não medi"** — carrega
> nele e a janela deixa de reclamar o que quer que seja.

Sem janela aberta:

| o que mediste | onde entra |
|---|---|
| Pressão | no teu prontuário, marcada como atribuída automaticamente (podes mover) — **ver a verificação abaixo** |
| ECG | no teu prontuário, pela ligação pessoal |
| Temperatura, SpO₂ | no teu prontuário, como já entram hoje |
| ECG do ScanWatch | **sempre teu**, mesmo que haja uma janela aberta |

**Uma verificação de um minuto, antes de contares com a primeira linha.** A
pressão só cai sozinha no teu prontuário se a ligação pessoal da conta pertencer
a um utilizador com papel **paciente** da mesma clínica. Se pertencer ao teu
utilizador de admin, a leitura vai para a **caixa de entrada** — não se perde,
mas pede um clique. Mede uma vez em ti e vê onde aparece.

**E o que a janela aberta custa ao teu próprio aparelho:** enquanto ela corre, a
temperatura, o SpO₂ e a FC que o **teu relógio** medir nesses três minutos não
entram em lado nenhum — a resposta da Withings para esses não diz que aparelho
mediu, logo a regra do pulso não se lhes aplica. O ECG do relógio não é afectado.

### Num paciente

1. Abre a ficha do paciente;
2. carrega em **Medir** — abre uma janela de **3 minutos** (há 30 s de folga
   antes, para o caso de o aparelho já estar a trabalhar);
3. mede dentro desses 3 minutos;
4. se não quiseres esperar pelo aviso da Withings, carrega em **"Já medi"** — vai
   buscar agora.

| o que mediste | onde entra |
|---|---|
| Pressão | **no prontuário do paciente**, com o teu nome como quem mediu |
| ECG | **no prontuário do paciente**, com registo de auditoria |
| Temperatura, SpO₂ | **ainda não entram em lado nenhum** — ver abaixo |
| Estetoscópio | ainda não lemos — há um `appli` 61 na API deles, por explorar |

## O que ainda não funciona, e é para saberes antes de medir

**Temperatura e SpO₂ medidos num paciente não são guardados.** Não vão para a
ficha errada — simplesmente não entram. A tabela onde esses valores vivem hoje
tem a chave de um *total do dia*; escrever lá uma medição pontual da clínica
apagaria a média do dia do próprio aparelho do paciente. Precisa de uma tabela
com forma de evento: é a **T-3**, a seguir.

Até lá, a temperatura e o SpO₂ de um paciente têm de ser anotados à mão.

## Quanto tempo demora a aparecer

| caminho | quando |
|---|---|
| Aviso da Withings (pressão, peso, passos, sono, **ECG**, VFC, temperatura) | segundos |
| Rede de segurança | de 15 em 15 minutos |
| Botão "Já medi" | imediato |

O ECG e a VFC não tinham aviso nenhum até 121 T-9 — esperavam sempre pelos 15
minutos.

## As três regras, em uma linha cada

1. **Sem janela, é teu.** Nenhuma acção exigida para o uso pessoal.
2. **Com janela, é de quem a janela nomeia.** É a única coisa que decide.
3. **O que se usa no pulso é sempre teu**, haja janela ou não — o relógio não
   muda de dono por causa do relógio da parede.

E a regra que está por trás das três: **ambiguidade nunca vira palpite.** Duas
janelas abertas ao mesmo tempo, ou uma falha a ler as janelas, e a medição não é
escrita em ninguém — fica na Withings, contada e dita no log, até alguém decidir.

## O que o paciente vê, e onde ainda mente

**Um ECG medido na clínica aparece no app dele como conclusão do relógio.** As
frases dizem *"O relógio não assinalou nada"*, *"O relógio encontrou sinais de
fibrilhação auricular"* — e a rota nem sequer manda o nome do aparelho ao
telefone. A linha de auditoria que diz quem mediu existe na base e nenhuma tela
a mostra. **Está por corrigir** (achado A-6 do QA).

A pressão medida na clínica **é** distinguida na lista (*"· medida na clínica"*),
mas não no cartão grande que ele vê primeiro.

## Se alguma coisa não aparecer

1. A ficha do aparelho na caixa de entrada diz **três coisas diferentes**: se a
   autorização está viva, se a Withings confirmou que vai entregar, e há quantos
   dias não chega nada. São estados distintos de propósito.
2. A pressão que chegou **fora** de uma janela está na caixa de entrada, à espera
   de alguém dizer de quem é.
3. Um ECG que não foi atribuído aparece no log do contentor como
   `ECG nao atribuidos: N sem janela` — e, a partir de agora, também nos totais
   do cron (`ecgNaoAtribuidos`). Caixa de entrada para ele: **T-4**.
