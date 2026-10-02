# T-1: O portão único de envio ao paciente

**Status:** pendente
**Depende de:** nenhuma

## Objetivo

Um lugar só que decide se uma mensagem pode sair para um paciente. Treze
rotas consertadas de treze jeitos divergem na primeira semana; um portão
não.

## Contexto

Hoje cada rota decide sozinha. O resultado está no plano: três formatos
diferentes de opt-in nas rotas conformes, e nenhum nas treze do grupo A.

O portão **não** substitui `lib/outbound-guard.ts` — aquele responde "este
ambiente pode mandar?". Este responde "esta mensagem foi confirmada por uma
pessoa?". São perguntas diferentes e ficam em camadas diferentes.

## Passos

1. Criar `lib/patient-send-gate.ts` com uma função que toda rota que
   mande ao paciente passa a chamar antes de `notifyPatient`,
   `sendEmail` ou push:

   ```ts
   type ConfirmacaoDeEnvio =
     | { modo: "explicito"; confirmado: boolean }   // notify: true no corpo
     | { modo: "preview"; hash: string }            // preview + hash
     | { modo: "fila" }                             // vai para a outbox
     | { modo: "transacional"; motivo: string };    // disparado pelo paciente

   export async function podeEnviarAoPaciente(args: {
     patientId: string;
     canal: "email" | "push" | "whatsapp" | "telegram" | "sms";
     confirmacao: ConfirmacaoDeEnvio;
     origem: string;  // rota, para o log e para a tela do T-7
   }): Promise<{ ok: true } | { ok: false; status: number; error: string; code: string }>;
   ```

2. **O padrão é não mandar.** `confirmado: false`, `confirmacao` ausente ou
   malformada → `{ ok: false }`. Nunca o contrário.
3. Aplicar o teto por paciente (ver Suposição 5 do plano): somar os canais
   na janela de 1h e recusar com 429 acima do teto.
4. Registrar toda decisão — a que deixa passar **e a que barra** — numa
   linha que o T-7 saiba ler. Sem isso a tela do T-7 mente por omissão.
5. Escrever o teste do caminho negativo **primeiro**: chamada sem
   confirmação não manda e devolve o código certo.
6. Documentar no topo do arquivo, em uma frase, por que ele existe — com a
   data e a frase do Bruno. Daqui a seis meses alguém vai querer "só
   simplificar isso aqui".

## Arquivos afetados

- `lib/patient-send-gate.ts` (novo)
- `__tests__/patient-send-gate.test.ts` (novo)
- `lib/notify-patient.ts` (só o comentário de topo, apontando para o portão)

## Critérios de aceite

- [ ] Chamada sem campo de confirmação é recusada, não ignorada em silêncio.
- [ ] `notify: false` e `notify` ausente dão o mesmo resultado: não manda.
- [ ] `hash` que não bate com o preview é recusado com 409.
- [ ] Acima do teto de 1h, recusa com 429 e diz quantos já saíram.
- [ ] Toda decisão — passou e barrou — deixa linha com `origem`, canal e
      `patientId`.
- [ ] Teste do caminho negativo existe e falha se alguém remover o portão
      (prove por mutação: inverta o default e veja o teste ficar vermelho).
- [ ] O portão **não** é chamado em caminho transacional do próprio
      paciente — ou, se for, com `modo: "transacional"` e motivo escrito.
