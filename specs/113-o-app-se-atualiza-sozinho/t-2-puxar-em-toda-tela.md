# T-2: Puxar para baixo, em toda tela

**Status:** ✅ já estava feita — verificada em 30/09
**Depende de:** T-1

## Objetivo

O gesto que todo mundo já tenta: segurar e arrastar para baixo, e a tela
atualizar.

## Contexto

Hoje algumas telas têm e outras não, e a que não tem é indistinguível de uma que
tem e não trouxe nada. O paciente puxa, nada acontece, e ele conclui que não há
novidade — quando na verdade ninguém perguntou.

## Passos

1. Levantar as telas que já têm e as que não têm. **Sem lista escrita à mão:**
   varrer, como a 110 fez com o menu.
2. Pôr o gesto nas que faltam, pelo mesmo componente — não um por tela.
3. Onde a tela tem lista própria que já rola, conferir que o gesto não briga com
   a rolagem nem com o arrastar de reordenar (112).

## Critérios de aceite

- [ ] Toda tela de dado do paciente atualiza ao puxar
- [ ] O indicador aparece e some — puxar sem retorno visível é pior que não ter
- [ ] Não dispara ao rolar para cima no meio da lista
- [ ] Um teste que cobra o gesto nas telas novas, sem lista à mão
