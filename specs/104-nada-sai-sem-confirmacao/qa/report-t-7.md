# QA — T-7: A tela única de tudo que saiu

**Veredito:** ✅ aprovado (API) · ⚠️ a tela não foi vista
**Data:** 02/10/2026 · **Método:** teste + mutação.

## Cenários

| # | cenário | resultado |
|---|---|---|
| 35 | um envio por canal aparece com data, canal, assunto e autor | ✅ (e-mail) |
| 36 | um envio **barrado** aparece marcado, com o motivo | ✅ |
| 37 | dá para ler o corpo do que foi enviado | ⚠️ truncado em 160 caracteres |
| 38 | nenhuma rota do grupo A fica fora da tela | ✅ por construção |
| 39 | funciona no telefone | ❌ **não verificável sem navegador** |

```
$ npx jest __tests__/notifications/a-tela-mostra-o-que-saiu-e-o-que-nao-saiu.test.ts
Tests:       7 passed, 7 total
```

## Mutação

| mutação | testes que caem |
|---|---|
| o `where` do `systemLog` perde o `userId` (leria decisão de outro paciente) | **1** |
| `SEND_BLOCKED` deixa de ser emitido (só mostraria sucesso) | **2** |

A primeira é a que importa para segurança: sem o filtro, a ficha de um
paciente mostraria o que a clínica mandou para outro.

## O que a tela passou a mostrar

| | |
|---|---|
| 🟢 saiu | assunto, quem apertou, idioma, erro do provedor quando falhou |
| 🟡 barrado | o motivo da recusa e a rota que tentou |
| 🔵 na fila | o que espera aprovação |

E cada linha diz **quem puxou o gatilho**: a clínica, o próprio paciente
(código de acesso, confirmação de upload) ou o sistema. Sem isso o
transacional afogaria o que se quer auditar.

## O que este QA não cobre

1. **A tela.** Tudo aqui é sobre a rota. Cor, ícone, legibilidade e o
   comportamento no telefone (cenário 39) não foram vistos por ninguém.
2. **O corpo completo do e-mail** (cenário 37). Aparece truncado em 160
   caracteres na descrição; o passo 4 pede poder abrir a mensagem inteira,
   e isso exige um diálogo que não foi construído.
3. **A paginação com nove fontes.** `take = offset + limit + 1` foi mantido
   e o raciocínio original continua válido, mas não há teste de segunda
   página com as fontes novas.
4. **Dado real.** Nenhuma leitura em banco de produção; os `where` foram
   conferidos, o resultado deles não.
5. **Vazamento entre inquilinos.** O filtro é por `patientId`, e o acesso
   ao paciente já é guardado por `staffPatientAccess` — mas não há teste
   aqui provando que staff de outra clínica não lê esta linha do tempo.
