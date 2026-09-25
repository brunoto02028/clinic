# T-7: O paciente desliga no proprio app

**Status:** pendente
**Depende de:** T-1

## Objetivo
Uma chave no perfil do app: receber ou nao notificacoes.

## Contexto
Sem isto, a unica saida de quem se incomoda e desinstalar - ou desligar nos Ajustes do iOS, onde
ninguem lembra que desligou. A chave tambem e o que torna honesta a contagem da T-4.

## Passos
1. Campo de preferencia no usuario (ou desativar os tokens dele).
2. Linha em `/(app)/(clinica)/profile` com o estado atual.
3. Desligado: o envio nem monta a mensagem para ele.
4. Se a permissao do sistema estiver negada, a tela diz isso e oferece os Ajustes - em vez de
   mostrar uma chave ligada que nao faz nada.

## Arquivos afetados
- `prisma/schema.prisma`, `app/api/patient/profile/route.ts`, `mobile/app/(app)/(clinica)/profile.tsx`

## Criterios de aceite
- [ ] Desligar para de receber, na hora
- [ ] O estado sobrevive a fechar e abrir o app
- [ ] Permissao negada no sistema aparece como tal, nao como chave quebrada
