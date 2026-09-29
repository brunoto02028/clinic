# Data safety — respostas para o formulário do Google Play

Levantado do código em 29/09/2026, não de memória. Cada linha tem onde ela vive.

**Isto é uma declaração legal em nome do Bruno.** Está escrito para ele conferir
antes de eu preencher o formulário. Onde eu não tive certeza, está marcado.

---

## As duas perguntas que valem por todas

**Os dados são criptografados em trânsito?** **Sim.** Tudo passa por HTTPS
(`https://bpr.clinic`); o app não tem endpoint em texto claro.

**O usuário pode pedir a exclusão dos dados?** **Sim.** Existe
`mobile/app/(app)/delete-account.tsx` no app, e o Google exige que essa
possibilidade esteja declarada **e** acessível — ela está.

---

## O que é coletado

| categoria do Google | o que é, aqui | obrigatório? | por quê | partilhado? |
|---|---|---|---|---|
| **Nome** | `firstName`, `lastName` | sim | identificar quem é atendido | não |
| **E-mail** | `email` | sim | login e comunicação da clínica | não |
| **Telefone** | `phone` | opcional | contato da clínica | não |
| **Endereço** | `address`, `city`, `postcode` | opcional | atendimento domiciliar e faturamento | não |
| **Outras info pessoais** | `dateOfBirth`, contato de emergência | opcional | receita exige identificação; emergência é segurança do paciente | não |
| **Info de saúde** | triagem, notas de sessão, avaliações, exames, pressão arterial, check-in diário, medidas de evolução | sim para quem é paciente | **é o produto**: é o prontuário | **sim**, entre profissionais que cuidam da pessoa — item a item, por decisão de quem detém o paciente, e o paciente vê e pode cortar |
| **Fotos e vídeos** | documentos fotografados, vídeo do exercício | opcional | mandar exame; o terapeuta assistir ao movimento | não |
| **Áudio** | mensagem de voz na conversa | opcional | falar em vez de escrever | não |
| **Mensagens no app** | conversa com a clínica | opcional | é a conversa | não |
| **Info de pagamento** | **não tocamos no cartão** | — | a folha é do Stripe; o app recebe só o resultado | — |
| **Ids do aparelho** | token de push do Expo | opcional | avisar que a consulta começou | Expo/Apple/Google, como operadores |

### O que **não** é coletado, e vale dizer

- **Localização** — nenhuma permissão de localização é pedida.
- **Contatos, agenda, SMS, chamadas** — nenhuma.
- **Histórico de navegação, buscas, apps instalados** — nenhum.
- **Número de cartão** — nunca chega ao nosso servidor; é a folha nativa do
  Stripe. É o ponto que mais confunde no formulário: *"Financial info"* fica
  **não coletado**, porque coletar é o Stripe que faz.

## As três permissões que o app pede

`CAMERA`, `READ_MEDIA_IMAGES`, `RECORD_AUDIO` — e os textos de justificativa do
iOS já dizem exatamente para quê (fotografar documento, anexar exame, gravar
vídeo curto do exercício). Nenhuma delas é de localização ou de contatos.

## Partilha — a resposta que exige cuidado

O Google separa **coletar** de **partilhar**. Partilhar é mandar para **outra
empresa**.

- Dados de saúde **entre profissionais que cuidam da mesma pessoa** (atividade
  102) é partilha entre controladores independentes, item a item, com registro,
  e o paciente vê tudo e pode revogar. **Declarar como partilhado.**
- Stripe, Expo, Daily (vídeo), Cloudflare R2 (mídia) e o provedor de e-mail são
  **operadores/processadores** — não é "partilha" na definição do Google. Não
  declarar como partilha, mas estar pronto para citá-los.

## Onde eu quero a sua confirmação

1. **"Dados de saúde" como partilhados** — é a resposta honesta pelo desenho da
   102, e é a que um revisor de app de saúde lê com atenção. Confirma?
2. **E-mail de contato público da ficha**: proponho `admin@bpr.clinic` — o
   domínio tem MX no Zoho, então recebe. Confirma que alguém lê essa caixa?
3. **Telefone público** — não achei nenhum número real no código (os que existem
   são de exemplo, faixa `7700 900000`). O campo é opcional; deixo vazio a menos
   que você me dê um.
