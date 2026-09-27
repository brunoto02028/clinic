# Categoria e classificação etária — decisão de 27/09/2026

## Categoria

**Primária: Medical. Secundária: Health & Fitness.**

O app guarda registro clínico, protocolo de tratamento prescrito, conversa com terapeuta e pedido
de exame de sangue. Isso é Medical na descrição da própria Apple. Health & Fitness é a categoria de
bem-estar e de acompanhamento de treino — é o nosso segundo lugar de direito, não o primeiro.

**Escolher Health & Fitness para fugir do escrutínio não funciona.** A Guideline 1.4.1 se aplica
pelo conteúdo, não pela categoria escolhida, e categoria que não bate com o app é por si um motivo
de rejeição. Medical custa uma pergunta a mais (quem é a entidade responsável e que qualificação
ela tem) e essa pergunta a gente sabe responder.

## Classificação etária: **16+**

Aqui está o ponto que precisa ficar claro, porque ele contraria a primeira impressão.

**"App para todas as idades" e "classificação 4+" não são a mesma coisa.** A sua leitura — de que
este é um app de paciente, para qualquer pessoa no Reino Unido que queira fazer um exame de sangue,
e não um app de atleta — está certa e é o que manda nos **textos da loja e na categoria**. A
classificação etária é outra coisa: ela decide a partir de que idade a App Store oferece o app. Não
tem nada a ver com limitar quem se beneficia dele.

E ela não pode contrariar o que nós mesmos publicamos.

**Atualizado em 27/09/2026 (atividade 091).** Esta seção dizia antes que a classificação 16+ se
apoiava na regra *"exames de laboratório são para maiores de 16 anos"*. **Essa regra não existe
mais, e nunca deveria ter existido:** `lib/lab-catalog.ts` marca `notUnder16` em dez dos vinte e
dois exames — hormônios e saúde sexual — e só neles. A frase geral transformava a regra de dez
exames na regra de todos.

O que os textos dizem agora, depois da 091 T-4 e T-6:

| onde | o que diz |
|---|---|
| `lib/lab-consent.ts` | a maior parte dos exames não tem limite de idade; hormônios e saúde sexual são 16+; menor de 18 é sempre pedido por quem responde por ele |
| termos, item 22 | o mesmo, e mais: **ter conta aqui é para maiores de 16 anos** |

**O 16 mudou de sujeito, e é isso que sustenta a classificação.** Ele deixou de ser "quem pode ser
examinado" e passou a ser "quem pode ter conta" — que é exatamente o que uma classificação etária
da App Store descreve. As duas afirmações passam a concordar em vez de brigar: o app é 16+ porque a
conta é 16+, e o exame serve a qualquer idade porque quem responde pela criança é que pede.

Os dois caminhos que levam a 16+ no questionário:

1. conteúdo médico e de tratamento, apresentado com frequência — é o que o app faz todo dia;
2. a nossa regra de que a **conta** é de maiores de 16.

### O que NÃO marcar

- **Made for Kids / Kids Category: não.** O app não é feito para criança, e entrar nessa categoria
  traria as regras de publicidade e de coleta de dados de menor, que não é o nosso caso.
- **Tracking: não.** Conferido no `package.json`: nenhum SDK de anúncio, nenhum IDFA, nenhum
  `NSUserTrackingUsageDescription`. Logo não existe prompt de ATT e a ficha de privacidade
  responde "nenhum dado usado para rastrear você".

### O caso do filho muda isso?

Não, e reforça — mas o desenho mudou desde que escrevi `exame-para-um-filho.md`. Ver a atividade
091, T-7.

A criança **é paciente de verdade**: tem prontuário, consulta, protocolo e nota clínica, porque o
Bruno pediu que ela faça tratamento de reabilitação. O que ela não tem é **como entrar**: a conta
dela nasce sem senha, com e-mail sintético em domínio `.invalid`, e o login recusa contas geridas
antes de qualquer outra checagem.

Então a frase para a Apple continua verdadeira e fica mais fácil de sustentar: **quem usa o app tem
16 anos ou mais.** A criança não usa o app — ela é cuidada por quem usa.
