# T-1: O texto que mente sobre o próprio sistema

**Status:** 🟢 concluída (29/09) — QA aprovado, review feito, achados corrigidos
**Depende de:** nenhuma

## Objetivo

Que a tela diga o que o sistema faz.

## Contexto

O diálogo de novo agendamento abre com *"o paciente receberá um e-mail de
confirmação automaticamente"*. A caixa logo abaixo, **desmarcada**, diz o
contrário — e é ela que manda.

O Bruno leu o texto, acreditou, e pediu uma funcionalidade que já existe. É o
melhor argumento que eu já vi para tratar texto de interface como código: um
defeito alguém mede; uma frase todo mundo acredita.

## Passos

1. Trocar a frase de abertura por uma que descreva o que acontece: **nada é
   enviado até alguém decidir**.
2. A caixa ganha o par que faltava: enviar agora, ou **escrever e ver a prévia**
   — e a segunda é a que a casa prefere, então é a que fica em evidência.
3. Depois de criar, um caminho visível para "escrever a confirmação agora", em
   vez de a pessoa ter de lembrar de voltar.
4. Varrer o diálogo atrás de outras frases que prometam o que o sistema não faz.

## Arquivos afetados
- `app/admin/appointments/page.tsx`
- `__tests__/agenda/o-texto-nao-mente.test.ts`

## O que apareceu atrás da frase

Ao ir trocar o texto, o defeito de verdade estava no servidor: a rota decidia
com `sendConfirmation !== false`, então o campo **ausente** mandava e-mail ao
paciente. A tela sempre mandava o campo, e por isso ninguém tinha visto — mas a
promessa da casa não é *"a tela toma cuidado"*, é *"nada sai sem alguém pedir"*.

Virou `pediramEnviarAoPaciente()` em `lib/notify-patient.ts`: o silêncio é não,
e só um sim explícito envia. É função com nome, e não um `=== true` solto,
porque um nome errado a gente lê — um operador invertido, não.

## Critérios de aceite
- [x] Nenhuma frase do diálogo diz que envia automaticamente.
- [x] O padrão continua **não enviar**, e o teste guarda isso — agora também
      para quem chama a rota sem passar o campo.
- [x] Existe caminho visível para escrever a confirmação depois (botão "Email
      confirmation" por consulta, e o toast aponta para ele).
- [x] Inglês e português dizem a mesma coisa.
- [x] QA mediu na caixa do paciente de teste que **nada sai** sem a caixa marcada.
