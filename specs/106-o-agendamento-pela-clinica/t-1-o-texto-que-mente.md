# T-1: O texto que mente sobre o próprio sistema

**Status:** pendente
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

## Critérios de aceite
- [ ] Nenhuma frase do diálogo diz que envia automaticamente.
- [ ] O padrão continua **não enviar**, e o teste guarda isso.
- [ ] Existe caminho visível para escrever a confirmação depois.
- [ ] Inglês e português dizem a mesma coisa.
