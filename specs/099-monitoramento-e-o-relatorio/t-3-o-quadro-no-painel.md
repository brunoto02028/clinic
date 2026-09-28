# T-3: O quadro do paciente no painel, ao longo do tempo

**Status:** pendente
**Depende de:** T-1

## Objetivo

O terapeuta abre um paciente e vê, numa tela, como ele andou — sem abrir seis
abas.

## Contexto

Hoje o painel tem `/admin/biohacking` (quem tem aparelho ligado e quem parou de
mandar dado) e as abas do paciente (atividade, aderência, bem-estar). O que
falta é o cruzamento: sono caindo **enquanto** a dor sobe é o tipo de coisa que
ninguém vê olhando uma aba por vez.

## Passos

1. Uma aba **Monitoramento** na ficha do paciente, com as séries lado a lado:
   sono, FC de repouso, HRV, SpO2, passos, pressão, dor, check-in e aderência
   ao exercício.
2. Mesma janela de tempo para todas — mudar o período muda tudo junto.
3. O que **não** tem dado aparece como "sem dado", e não some: a ausência é
   informação (parou de usar o relógio, parou de fazer check-in).
4. Um resumo em palavras no topo: o que mudou mais no período.
5. Botão **Gerar relatório** a partir daqui, com o período selecionado.

## Arquivos afetados

- `components/admin/patient-monitoring-tab.tsx` (novo)
- a ficha do paciente no painel
- `app/api/admin/patients/[id]/monitoring/route.ts` (novo)

## Critérios de aceite

- [ ] As séries compartilham a janela de tempo
- [ ] "Sem dado" aparece, em vez de a linha sumir
- [ ] Só equipe da clínica dona do paciente abre — outro tenant recebe 404
- [ ] O botão leva ao relatório já com o período
