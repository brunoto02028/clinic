# Atividade 111 — O que o app faz, para contar ao mundo

**Aberta:** 30/09/2026
**Origem:** o Bruno vai reescrever as páginas públicas do site e divulgar o app e
os serviços novos. Pediu o inventário do que temos e do que vem.

**Esta atividade não muda código.** É a fonte do conteúdo, para ser executada
noutra branch. O que está aqui foi **lido do código**, não da memória — cada
linha tem onde conferir.

## A condição da divulgação, decidida em 30/09/2026

O Bruno:

> *"Tudo vai ficar pronto, só iremos divulgar com laboratório funcionando e o
> app 100% aprovado."*

**Duas travas, e elas mudam como estas páginas se escrevem.**

Nada sai enquanto o **laboratório** não estiver funcionando e o app não estiver
**aprovado nas lojas**. Isso simplifica tudo: as páginas podem ser escritas no
**presente**, sem "em breve", sem data prometida, sem hedge. No dia em que
saírem, tudo o que elas disserem já é verdade.

Também resolve três das perguntas que estavam abertas no fim deste documento: o
laboratório **entra**, a aprovação nas lojas é **pré-requisito**, e não há data a
prometer porque a divulgação é que espera, não o produto.

O que continua valendo de aviso: 🔴 continua fora. Estar pronto não é o mesmo que
existir, e os quatro interruptores sem tela seguem sem tela.

## Como ler isto

Três estados, e eles importam mais que a lista:

| | significado |
|---|---|
| 🟢 **no ar** | funciona no app hoje, com paciente real |
| 🟡 **existe, fechado** | o código está pronto e uma chave o segura |
| 🔴 **não existe ainda** | há interruptor no painel e nenhuma tela |

**Nada marcado 🔴 pode ir para uma página pública.** O painel de permissões tem
quatro interruptores que não acendem nada, e é exatamente o tipo de coisa que
vira promessa num site e reclamação no app.

## O idioma

Inglês é a língua primária do produto; o português vem junto. Os pares abaixo são
os textos **que o paciente lê no telefone** — não traduções novas. Usar outra
palavra no site que a do app é como se perde a confiança no detalhe.

Três regras da casa que valem para todo texto público:

- **"Terapeuta" / "therapist"**, nunca "fisioterapeuta".
- **Nunca "diagnóstico".** Geramos relatórios detalhados; quem diagnostica é
  médico — e é o que nos mantém fora da definição de dispositivo médico.
- **Sem "Rehab"** em texto novo: o termo remete a dependência química.

E o domínio é **bpr.clinic**. O `bpr.rehab` está aposentado.

---

# 1. O que o app é

Um aplicativo onde o paciente da BPR encontra **o seu tratamento**: o que foi
feito, o que ele tem de fazer, e como está indo.

Depois do lançamento, **o app é o único lugar do paciente** — a área dele no site
perde acesso. Isso é decisão tomada, e muda o tom das páginas públicas: elas
deixam de ser "entre no seu portal" e passam a ser "baixe o app".

## As áreas

O app tem mais de uma área, e a pessoa alterna entre elas por *Switch area*.

| área | estado | o que é |
|---|---|---|
| **Clínica** | 🟢 no ar | o tratamento na BPR |
| **Laboratório** | 🟡 existe, fechado | exames de sangue, com coleta |
| Treino, Nutrição, Avaliações | 🟡 parcial | telas do produto do personal, fora do escopo do paciente da clínica |
| BA One | 🔴 fora | não entra neste lançamento |

Uma pessoa pode ter mais de uma área na mesma conta. O site pode dizer isso: uma
conta, e o que ela alcança depende do que a clínica liberou.

---

# 2. O que já funciona — as quatro coisas que ele abre

O app tem quatro abas. São elas que uma página pública deve mostrar primeiro,
porque são o que a pessoa vê ao abrir.

| aba | EN | PT |
|---|---|---|
| Início | Home | Início |
| Consultas | Appointments | Consultas |
| Exercícios | Exercises | Exercícios |
| Menu | Menu | Menu |

## 2.1 Consultas 🟢

- **Marcar consulta pelo app**, escolhendo dia e horário entre os que a agenda
  realmente tem livres.
- **Três formatos:** na clínica, por vídeo, ou **em casa** (visita domiciliar).
- **Pagar no app**, ou combinar com a clínica — transferência, dinheiro, ou
  liberado sem cobrança. A clínica decide se o agendamento exige pagamento.
- **Consulta por vídeo dentro do app**, com aviso no telefone quando o terapeuta
  entra na sala.
- **Cancelar**, com a regra de 24 horas.
- **Remarcar**, com um número de remarcações gratuitas.

**Para o site:** *"Book from your phone — in the clinic, by video, or at your
home."* / *"Marque pelo telefone — na clínica, por vídeo ou em casa."*

## 2.2 Exercícios 🟢

- Os exercícios que o terapeuta prescreveu, **com vídeo**.
- O paciente **grava a execução** e manda para o terapeuta ver.
- O terapeuta responde com um retorno.

**Para o site:** *"Your exercises, with video — and your therapist watches how
you do them."* / *"Seus exercícios, com vídeo — e o terapeuta vê como você os
faz."*

## 2.3 O prontuário e os documentos 🟢

| no app | EN | PT |
|---|---|---|
| prontuário | My records | Meu prontuário |
| documentos | My documents | Meus documentos |
| faturas | Invoices | Faturas |
| relatórios | My reports | Meus relatórios |

- **As notas de sessão** que o terapeuta escreveu — quando a clínica libera.
- **Documentos médicos**, para ver e enviar.
- **Faturas com o PDF**, que antes só chegavam por e-mail: quem apagasse o
  e-mail perdia o papel.

> **A nota clínica é decisão do terapeuta, não do plano.** Desde 30/09/2026 ela
> tem interruptor próprio, separado dos relatórios de progresso. Uma clínica pode
> mostrar a evolução e guardar a nota crua — que é escrita de profissional para
> profissional. É um argumento bom para o site, e é verdade.

## 2.4 O acompanhamento 🟢

| no app | EN | PT |
|---|---|---|
| progresso | My progress | Meu progresso |
| medidas de evolução | Outcome measures | Medidas de evolução |
| check-in diário | Daily check-in | Check-in diário |
| pressão arterial | Blood pressure | Pressão arterial |

- **Medidas de evolução** — as escalas que mostram se está melhorando.
- **Check-in diário.**
- **Pressão arterial**, lançada à mão ou lida do aparelho da clínica.

## 2.5 Dispositivos 🟢 — só Withings

| no app | EN | PT |
|---|---|---|
| dispositivos | Devices | Dispositivos |

Conecta um vestível e traz **sono, atividade e recuperação**.

**Só a Withings está ligada.** Os outros seis provedores estão desligados no
código. O site **não pode** dizer "conecte seu vestível" de forma genérica — tem
de dizer qual.

## 2.6 Conversa com a clínica 🟢

| no app | EN | PT |
|---|---|---|
| mensagens | Messages | Mensagens |
| pendências | Pending actions | Pendências |

- **Mensagens** com a clínica, com contagem do que não foi lido.
- **Pendências** — o que a clínica pediu e falta fazer.

## 2.7 Material educativo 🟢

| no app | EN | PT |
|---|---|---|
| artigos | Articles | Artigos |

Os artigos do site virados material clínico. O terapeuta **atribui** um material a
um paciente, com observação escrita para ele, e pode marcar como obrigatório e
com prazo.

**Para o site:** os artigos públicos e o material do app são o mesmo acervo visto
de dois jeitos. Vale dizer.

## 2.8 Privacidade e consentimento 🟢

| no app | EN | PT |
|---|---|---|
| quem tem acesso | Who has access | Quem tem acesso |
| termos | Terms & consent | Termos & consentimento |
| quem eu cuido | People I look after | Quem eu cuido |

- **Quem tem acesso** — a lista de quem lê o prontuário dele.
- **Quem eu cuido** — uma mãe pode cadastrar a filha e marcar por ela.
- **Apagar a conta**, pelo próprio app.

> **"Quem tem acesso" é um argumento de página inicial.** Poucos aplicativos de
> saúde mostram ao paciente quem lê a ficha dele. Ele não está atrás de plano
> nenhum, de propósito: saber quem tem a chave da sua casa não é funcionalidade
> que se venda.

## 2.9 Notificações 🟢

Avisos no telefone quando **a clínica fez algo**: consulta marcada, remarcada,
cancelada, material novo, mensagem nova, e o toque de que a consulta por vídeo
começou.

> **Nada sai para o paciente automaticamente.** Não há robô mandando lembrete;
> cada aviso é alguém da clínica apertando um botão. É uma promessa que o site
> pode fazer com a consciência limpa.

---

# 3. O que existe e está fechado 🟡

Coisas prontas que uma chave segura.

**Depois da decisão de 30/09, estas não precisam de "em breve":** a divulgação
espera o laboratório funcionar, então no dia em que as páginas saírem ele já é
presente do indicativo. O que tem de ser conferido, uma a uma, é se a chave está
**de facto** aberta quando o texto for publicado — uma página que promete o que
uma variável de ambiente ainda segura é a mesma promessa vazia do 🔴, com outro
mecanismo.

| o quê | o que falta |
|---|---|
| **Laboratório — exames de sangue** | `LAB_ORDERING_ENABLED`; a compra depende de liberação do parceiro |
| **Chamada de vídeo** | `VIDEO_CALLS_ENABLED` |
| **Cupons** | `COUPON_ENABLED` |
| **Relatórios automáticos** | `AUTO_REPORTS_ENABLED` |
| **Cobrança do personal** | Stripe Connect por ativar |

O **laboratório** merece parágrafo próprio quando abrir: exames com **pontos de
coleta**, checkout no app, e resultado só depois de liberação. Já tem tela de
*como funciona*.

---

# 4. O que NÃO existe 🔴 — e não pode ir para o site

Há interruptor no painel de permissões e **nenhuma tela no app**:

| o quê | situação |
|---|---|
| **Achievements / Conquistas** | sem tela no app |
| **Community / Comunidade** | sem tela no app |
| **Marketplace** | sem tela no app |
| **Pre-Consultation Recording** | sem tela no app |
| **Quizzes** | a tela existe e não abre nada; fora do menu de propósito |

Desde 30/09/2026 esses quatro carregam no painel o selo *"Not in the app yet"*.
Foi assim que se descobriu o problema: ligar não acendia nada.

**Quando eles são feitos — decidido em 30/09/2026.** O Bruno: *"só vamos mexer
nelas depois de todas as outras coisas prontas e revisadas."*

São os **últimos** da fila, depois do laboratório e da aprovação nas lojas. Isso
fecha a pergunta que a 110 T-1 tinha deixado aberta — marcar ou construir: marcar
agora, construir por último.

Para quem escrever as páginas, a consequência é simples e não muda com o tempo:
**eles não entram no texto**, nem como "em breve". Uma funcionalidade que é a
última da fila não tem data, e prometer sem data é como se cria a primeira
reclamação.

**A jornada (BPR Journey)** é caso à parte: o interruptor existe e hoje acende o
**check-in diário**, não uma tela de jornada. O conteúdo dela ainda vai ser
revisto. **Não prometer "sua jornada de reabilitação" como tela** — prometer o
check-in diário, que é o que há.

---

# 5. Como isso vira páginas

As páginas públicas de hoje:

```
/            /services      /conditions    /articles     /clinics
/get-the-app /join          /signup        /help         /beyond-pain
/biohacking  /shop          /scan          /pt           /patient-preview
```

Sugestão de por onde o conteúdo entra — **a executar noutra branch**:

| página | o que muda |
|---|---|
| `/` | a promessa deixa de ser "portal" e passa a ser o app; as quatro abas como prova |
| `/get-the-app` | a página mais importante do lançamento: o que se faz lá dentro, com as capturas reais |
| `/services` | os formatos de consulta (clínica, vídeo, domicílio) e as formas de pagamento |
| `/conditions` | liga cada condição ao material educativo que o paciente recebe |
| `/articles` | dizer que o mesmo acervo chega ao app atribuído pelo terapeuta |
| `/help` | como entrar, trocar de área, quem tem acesso aos dados, apagar a conta |
| `/pt` | tudo acima, com os textos **do app**, não traduzidos de novo |

## Um aviso que vale dinheiro

**19 links de e-mail apontam para `/dashboard/*` na web.** Quando a área do
paciente na web perder acesso, esses e-mails passam a mandar a pessoa para uma
porta fechada.

**Decisão do Bruno (30/09/2026): resolver no momento de publicar o app**, não
antes. Vira item de lançamento, junto com a decisão de bloquear ou não a web do
paciente.

O que fica dito, para quem executar: tem de sair **antes da primeira campanha**.
Publicar o app e divulgar são dois momentos, e é entre eles que estes links têm
de mudar — senão a campanha leva gente para o lugar errado no primeiro dia.

---

# 6. O que ainda não sei, e alguém tem de decidir

Suposições minhas, que precisam de validação antes de virar texto público:

~~**A data do lançamento.**~~ Respondida em 30/09: não há data a prometer — a
divulgação espera o laboratório e a aprovação nas lojas. O que **continua** em
aberto é quando a web do paciente é desligada, e os 19 e-mails saem junto.

~~**O laboratório entra?**~~ Entra, e é trava: sem ele funcionando, não se
divulga.

~~**iOS e Android.**~~ Aprovação nas lojas é pré-requisito. Fica o registro de
que o **TestFlight nunca saiu para testador externo** — é etapa antes da
aprovação, não depois.

Continua em aberto:

- **Preço e planos no site.** Existe *Plans & Membership* no app e não sei o que
  pode ser dito publicamente.
- **As capturas.** Uma página de app se vende por imagem. As do QA servem de
  rascunho, mas são de paciente de teste e ambiente local — as de verdade têm de
  sair do app aprovado, com dado que possa ser mostrado.
- **O laboratório está sem tradução.** As dez telas dele não usam `useLang`/`tr`,
  enquanto a clínica é traduzida inteira. A decisão de 24/09 foi não traduzir
  antes da API do parceiro existir, porque nome de exame, preço e método de
  coleta vêm do catálogo deles. **Se o laboratório é trava da divulgação, a
  tradução dele entra no caminho crítico** — e um site bilíngue apontando para um
  app com dez telas só em inglês é uma emenda visível.

## Tarefas

Nenhuma. Esta atividade é a fonte; a execução é noutra branch.
