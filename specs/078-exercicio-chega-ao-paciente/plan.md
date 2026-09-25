# Atividade 078 — O exercicio chega ao paciente

## Objetivo

O Bruno abriu o app de um paciente novo e nao achou exercicio nenhum. Investiguei, e o vazio tem
**duas causas diferentes** — uma delas e um erro de conceito, nao de tela.

## O que medi antes de planejar (25/09/2026)

**1. Quem se cadastra sozinho nao tem o modulo.** `mod_exercises` esta em `TREATMENT_MODULES`
(`lib/patient-access.ts:61-68`): so e concedido por pacote de tratamento pago, por plano/assinatura
que inclua a feature, por `fullAccessOverride`, ou por override manual no perfil. O paciente que
cria a conta e nao tem nada disso abre a aba e le *"nao esta incluido no seu plano"* — e a API
responde `403 module_not_in_plan`.

**2. Mesmo com o modulo ligado, a lista e so o que a clinica prescreveu.** Sem prescricao, a tela
diz *"Nenhum exercicio prescrito"*, e o botao de enviar video vive **dentro** de um exercicio.
Sem prescricao, nao existe de onde enviar.

## A decisao: a clinica prescreve, e prescrever libera

O paciente **nao** passa a mandar exercicio por conta propria. O video preso a um exercicio e o que
torna a revisao possivel — "e o seu agachamento unipodal, semana 3". Video solto vira, em duas
semanas, a pilha sem contexto que a 076 foi desenhada para evitar. E inverteria a responsabilidade
clinica: o paciente nao inventa o exercicio e pede aprovacao.

**O que muda e outra coisa, e e o bug de conceito:** hoje o modulo depende de **comercio**, nao de
**cuidado**. Se o terapeuta prescrever um exercicio agora, o app do paciente pode continuar
dizendo "nao esta incluido no seu plano", porque ele nao tem pacote nem assinatura. O ato clinico
nao abre a porta; so a venda abre.

Prescrever passa a ser motivo de concessao, ao lado de pacote e plano.

## Tarefas

| T-N | nome | status |
|-----|------|--------|
| T-1 | prescrever libera o modulo de exercicios | implementada, aguarda QA |
| T-2 | os dois textos vazios passam a dizer a verdade | implementada, aguarda aparelho |
| T-3 | a clinica ve quem esta com o app vazio | implementada, aguarda QA |

T-1 e o que destrava; T-2 e T-3 sao acabamento barato em cima dele.

## Nada disto exige build novo

T-1 e servidor. T-3 e servidor e painel. T-2 mexe em tela do app, mas so em JavaScript — o
fingerprint nao muda, entao chega no build 12 por `eas update`, no canal `production`.

## Suposicoes — precisam do seu aval

1. **Prescricao ativa basta.** `ExercisePrescription.isActive = true`, sem olhar protocolo nem
   data. Uma prescricao arquivada nao conta.
2. **So o modulo de exercicios.** Prescrever nao libera nutricao, avaliacoes nem nada alem do que
   a prescricao trata. A concessao e do tamanho do ato.
3. **Override manual continua tendo a ultima palavra.** Se voce marcar `hidden` para um paciente,
   ele fica escondido mesmo com prescricao — a ordem atual do calculo ja garante isso.
4. **"App vazio" = paciente ativo, com o modulo, e zero prescricao ativa.** Quem nunca teve
   tratamento nao entra na conta: seria cobrar da clinica um paciente que ainda nao e dela.
