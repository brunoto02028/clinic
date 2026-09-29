# T-4: O que fazer com o que assusta

**Status:** pendente
**Depende de:** T-3

## Objetivo

Decidir — e escrever — o que acontece quando o número é ruim.

## Contexto

Esta é a tarefa mais importante e a que menos tem código. Monitoramento contínuo
**vai** produzir leituras altas, inclusive de madrugada. O sistema precisa saber
o que fazer com elas antes de a primeira aparecer.

Duas coisas que a casa já decidiu e valem aqui:

1. **Nada sai para paciente automaticamente** (17/09/2026). Uma pressão alta às
   três da manhã não pode fazer o telefone dela tocar dizendo isso — e muito
   menos sem alguém do outro lado para responder.
2. **O app não é serviço de emergência**, e o aviso da 074 já diz isso.

## Passos

1. Faixas definidas **com o Bruno**, não copiadas de um site: o que é "ver
   quando puder" e o que é "ver hoje".
2. O sinal aparece **para a clínica**, na fila de pendências que a 103 T-2
   criou — um lugar que alguém já abre.
3. Falar com a paciente é um botão, com prévia, como todo envio da casa.
4. O texto que ela lê **nunca** é um número solto: número sem contexto às três
   da manhã é pânico, não cuidado.
5. Escrito no material dela que isto não substitui aferição nem emergência.

## Arquivos afetados
- `lib/pressao-continua.ts`
- a fila de pendências da 103 T-2
- `components/admin/avisar-*` (reaproveitar o fluxo com prévia)

## Critérios de aceite
- [ ] As faixas estão escritas, e o Bruno as validou.
- [ ] Nenhum aviso automático ao paciente — provado por teste.
- [ ] O sinal chega à clínica num lugar que alguém já abre.
- [ ] O texto ao paciente passa por prévia.
- [ ] O material diz que não é diagnóstico nem emergência.
