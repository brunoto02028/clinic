# Prontidão para a App Store — auditoria de 26/09/2026

**Nada foi submetido.** Isto é o levantamento do que existe, do que falta e do que provavelmente
seria rejeitado, para a decisão ser tomada com a lista na frente.

O binário auditado é o **build 17** (`e1a1a594…`).

---

## O que já está pronto

| | |
|---|---|
| Ícone, splash, nome, bundle | `com.bpr.clinic`, versão 1.0.0 |
| Declaração de criptografia | `ITSAppUsesNonExemptEncryption: false` |
| Permissões, com frase própria | câmera, fotos, salvar foto, microfone, Face ID |
| Política de privacidade e termos | públicos em `/terms`, e agora de uma fonte só |
| Login social | **não existe** — e por isso o *Sign in with Apple* não é exigido |
| Orientação, iPad | suportados |

---

## O que bloqueia, por ordem de risco

### 1. Apagar a conta — **construído hoje, falta a tela**

Guideline 5.1.1(v). Todo app que deixa criar conta tem de deixar apagá-la **de dentro do app**. É
das rejeições mais comuns que existem.

A rota existe desde hoje: `DELETE /api/patient/account`. **Falta o caminho na tela do app** —
Minha conta → Apagar minha conta, com a explicação e uma confirmação.

E a explicação importa, porque aqui há um conflito real: a Apple quer a conta apagada, e o registro
clínico tem retenção legal — os nossos próprios termos dizem "no mínimo 5 anos". A saída é a
padrão: **a conta some, o prontuário fica**, e a tela diz isso em vez de prometer o que não vai
acontecer.

### 2. Conta de demonstração para o revisor — **não preparada**

O app é inteiro atrás de login. Sem um usuário e senha no campo de notas do App Store Connect, o
revisor vê a tela de entrada e rejeita por "não consegui avaliar". É um dos motivos mais bobos e
mais frequentes.

Precisa de: um paciente de teste em **produção**, com dado plausível (consulta marcada, exercício
prescrito, um exame no catálogo) e que não seja pessoa real.

### 3. Pagamento — **decidir antes, não depois**

Guideline 3.1.1: bem ou serviço **digital** consumido no app exige compra dentro do app (e 30%).
Serviço do mundo real pode cobrar por fora.

O que o app cobra:

| | leitura |
|---|---|
| Consulta com terapeuta | serviço do mundo real → fora do IAP, tranquilo |
| Exame de sangue (kit, coleta) | serviço do mundo real → fora do IAP, tranquilo |
| Plano/pacote de sessões | **depende do que ele dá** — se for só sessão presencial, é mundo real; se der conteúdo dentro do app, a Apple pode chamar de digital |

Hoje o pagamento abre o navegador (`openCheckout`), o que é o caminho certo para serviço do mundo
real. **Vale olhar o texto dos planos** antes de submeter: se ele promete algo que só existe dentro
do app, a leitura muda.

### 4. Capturas de tela — **não existem**

São obrigatórias, por tamanho de aparelho. Como o `supportsTablet: true` está ligado, a Apple pede
também as de **iPad** — e é comum descobrir isso na hora de submeter.

Mínimo: iPhone 6.7" e iPad 12.9". Precisa de tela com dado plausível, não vazia.

### 5. App de saúde — escrutínio maior

Guideline 1.4.1 e 5.1.1. App clínico costuma receber pergunta sobre quem é a entidade responsável e
que qualificação ela tem. Ter a clínica registrada e visível no texto ajuda.

O que já joga a favor: os termos dizem explicitamente que **análise por IA não é diagnóstico**, que
a decisão clínica é do terapeuta, e — no laboratório — que o resultado é da pessoa e que ninguém lê
antes dela.

---

## O que falta preparar fora do código

| | estado |
|---|---|
| Nome na loja, subtítulo, descrição, palavras-chave | não escritos |
| Categoria e classificação etária | não definidas |
| URL de suporte | precisa existir e responder |
| Ficha de privacidade ("nutrition label") | não preenchida — e ela tem de bater com o que o app coleta de verdade |
| Conta de demonstração + notas para o revisor | não preparadas |
| Capturas | não existem |

Sobre a ficha de privacidade, o que o app coleta hoje e precisa ser declarado: identificação (nome,
e-mail, telefone, data de nascimento), saúde (triagem, dor, medidas, exames), **localização
aproximada** (cidade por IP), identificadores (token de push) e conteúdo do usuário (vídeo de
exercício, mensagem de voz, foto de documento).

**Declarar a mais é tão ruim quanto a menos** — o IP, por exemplo, vira cidade e é descartado; a
ficha deve dizer "localização aproximada", não "localização precisa".

---

## O que eu faria, na ordem

1. **A tela de apagar a conta** — é o único bloqueio que é código, e o resto não depende dela.
2. **Conta de demonstração em produção**, com dado plausível.
3. **Capturas**, iPhone e iPad.
4. **Ficha de privacidade**, com a lista acima.
5. **Ler o texto dos planos** com a pergunta do IAP na cabeça.
6. Textos da loja e URL de suporte.

Nada disso exige build novo. Tudo é ou tela do app (que vai por `eas update`) ou ficha do App Store
Connect.
