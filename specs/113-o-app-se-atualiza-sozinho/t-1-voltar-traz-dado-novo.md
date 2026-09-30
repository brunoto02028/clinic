# T-1: Voltar ao app traz dado novo

**Status:** ✅ já estava feita (075 T-12) — verificada em 30/09

## Objetivo

Que voltar ao app — depois do Face ID, ou só trocando de aplicativo e voltando —
mostre o que existe agora, e não o que existia quando a tela foi aberta.

## Contexto

O app usa `@tanstack/react-query`, então isto não é escrever recarregamento à
mão: é dizer ao cache o que fica velho quando o app volta ao primeiro plano.

O cuidado está no "quando": invalidar a cada volta transforma trocar de app em
enxurrada de pedidos. A proposta é invalidar quando o app esteve fora por mais
que poucos segundos.

## Passos

1. Um ouvinte de estado do aplicativo, num lugar só.
2. Ao voltar, invalidar o que está em tela — e `patient-access` junto, porque é
   o que decide o que o menu mostra, e é a mudança que o Bruno mais quer ver.
3. Um tempo mínimo fora antes de invalidar.
4. Nada de piscar: a tela mostra o que tem enquanto busca, e troca quando chega.

## Critérios de aceite

- [ ] Sair do app, mudar um módulo no painel, voltar — o menu mudou sem fechar
- [ ] Voltar depois de dois segundos não dispara enxurrada
- [ ] A tela não fica em branco durante a atualização
- [ ] Sem rede, a tela continua mostrando o que tinha, sem erro na cara
