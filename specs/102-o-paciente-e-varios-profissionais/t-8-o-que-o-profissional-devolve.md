# T-8: O que o médico devolve — receita e documento

**Status:** concluído
**Depende de:** T-3

## Objetivo

> *"Eles só recebem os dados dos pacientes, exames, agendam datas de consultas
> e retornam com receita para os pacientes se medicarem."*

## Contexto

O caminho de documento até o app já existe: `pushDocumento`, a tela de
documentos do paciente, e o link assinado que o `middleware.ts` deixa passar
sem sessão.

O que falta é o **outro sentido**: o profissional escreve, assina com nome e
registro, e aquilo chega ao paciente.

E a regra da casa vale inteira: **nada sai para o paciente sozinho**, e nada
sai sem prévia — foi o que a [101 T-2](../101-o-video-o-artigo-e-o-agendamento/)
construiu para o material educativo.

## Passos

1. Um documento com tipo (receita, laudo, orientação, pedido de exame),
   corpo, e a assinatura: nome, tipo de registro e número.
2. Prévia do que o paciente vai ver, com o logo da BPR, antes de enviar.
3. Enviar é **um botão**, e o aviso no telefone também.
4. O documento fica na ficha do paciente e na tela de documentos do app.
5. Receita é documento clínico: **não se apaga**, encerra-se — quem apagar some
   com a prova de uma prescrição.

## Critérios de aceite

- [ ] O paciente recebe com nome e registro de quem assinou.
- [ ] Prévia obrigatória, com logo, antes de qualquer envio.
- [ ] Nada chega ao paciente sem alguém apertar um botão.
- [ ] Um profissional não lê documento que outro escreveu, a menos que o
      paciente libere.
- [ ] Assinatura digital ICP-Brasil **não** entra aqui — está declarado no
      plano como fora de escopo.
