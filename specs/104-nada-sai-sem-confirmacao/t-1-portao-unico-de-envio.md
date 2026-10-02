# T-1: O portão único de envio ao paciente

**Status:** pendente
**Depende de:** nenhuma

> **Revisto em 02/10/2026, depois de trazer o `main`.** Esta tarefa era
> "criar um portão". **Metade dele já existe** e foi escrita por outra
> sessão: `pediramEnviarAoPaciente` em `lib/notify-patient.ts:87`.
>
> ```ts
> export function pediramEnviarAoPaciente(pedido: unknown): boolean {
>   return pedido === true || pedido === "true";
> }
> ```
>
> Com o comentário certo em cima: *"o silêncio — campo ausente, nulo, vazio
> — é **não**. Só um sim explícito envia. Isto é uma função e não um
> `=== true` solto porque já escorregou uma vez."*
>
> Então a tarefa deixa de ser inventar e passa a ser **espalhar e
> reforçar**. Está usada em **duas** rotas (`app/api/admin/appointments/route.ts:171`
> e `app/api/appointments/[id]/route.ts:287`) e precisa estar em todas.

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

1. **Não criar arquivo novo.** Crescer `lib/notify-patient.ts` em volta do
   `pediramEnviarAoPaciente` que já está lá, acrescentando o que falta: os
   outros modos de confirmação, o teto por paciente e o registro.

   ```ts
   type ConfirmacaoDeEnvio =
     | { modo: "explicito"; confirmado: boolean }   // já coberto hoje
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

   O modo `"explicito"` **delega** a `pediramEnviarAoPaciente`. Não
   reimplementar a comparação: foi justamente um operador invertido
   (`!== false`) que causou o defeito original.

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

- `lib/notify-patient.ts` (crescer em volta do que já existe)
- `__tests__/patient-send-gate.test.ts` (novo)

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
- [ ] `pediramEnviarAoPaciente` continua existindo e sendo a única
      comparação do modo explícito — nenhuma rota faz `=== true` por conta.
- [ ] As duas rotas que já o usam (`admin/appointments:171`,
      `appointments/[id]:287`) continuam funcionando igual.
