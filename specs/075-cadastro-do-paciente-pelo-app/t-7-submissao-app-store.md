# T-7: Preparar a submissão à App Store

**Status:** pendente · **Depende de:** T-4

## Objetivo
Sair do TestFlight interno e chegar à loja, que é o único jeito de um paciente baixar.

## Contexto
Hoje o app é "BPR (eddaac)" — o nome "BPR" estava tomado quando o EAS criou o registro. Para
revisão pública isso precisa de um nome definitivo.

## Passos
1. Renomear o app no App Store Connect.
2. Responder o **App Privacy**: o app coleta dado de saúde, e isso tem que estar declarado com
   precisão — é o ponto mais provável de rejeição num app clínico.
3. Screenshots nos tamanhos exigidos, descrição, palavras-chave, URL de suporte,
   `https://bpr.clinic/privacy` como política.
4. **Conta de demonstração para o revisor**, com dados de teste — um paciente de teste
   identificado, nunca uma paciente real.
5. Submeter e acompanhar a revisão.

## Arquivos afetados
- Nenhum no repositório; é App Store Connect. O que for decidido volta para `mobile/app.json`.

## Critérios de aceite
- [ ] App com nome definitivo
- [ ] App Privacy respondido e coerente com o que o app faz
- [ ] Revisor consegue entrar com a conta de demonstração e ver o produto
- [ ] Aprovado e disponível
