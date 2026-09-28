# T-2: A tela de monitoramento do paciente — tendência, não só ontem

**Status:** pendente
**Depende de:** T-1

## Objetivo

O paciente vê **como a coisa anda**, não só o último número.

## Contexto

`wearable-data.tsx` mostra o dia mais recente de cada métrica. Um número solto
não diz nada a ninguém: 62 bpm de repouso é bom ou ruim conforme o que ele era
há três semanas.

## Passos

1. Uma linha do tempo por métrica — sono, FC de repouso, HRV, SpO2, passos —
   com 7, 30 e 90 dias. Padrão 30.
2. Cada métrica diz **a variação no período**, em palavras: "FC de repouso 4 bpm
   menor que há 30 dias".
3. Dia sem dado é **buraco**, não zero. Uma noite sem o relógio no pulso não é
   uma noite sem sono, e desenhá-la como zero inventa uma queda.
4. Pressão e check-in diário entram na mesma tela — hoje moram em telas
   separadas e são o mesmo assunto.
5. **Sem semáforo de "normal/anormal".** Faixa de referência é leitura clínica;
   a tela do paciente mostra o que foi medido e como mudou.

## Arquivos afetados

- `mobile/app/(app)/(clinica)/wearable-data.tsx`
- `mobile/src/api/` (a série temporal)
- `app/api/wearables/…` (a rota da série)

## Critérios de aceite

- [ ] As três janelas funcionam e a padrão é 30 dias
- [ ] Dia sem dado não vira zero no gráfico
- [ ] A variação aparece em palavras, nas duas línguas
- [ ] Paciente sem aparelho vê uma tela que explica, não um gráfico vazio
