# T-5: Ligar o domicílio por tipo de tratamento

**Status:** concluído (28/09/2026)
**Depende de:** T-1

## Objetivo

A clínica decide quais tratamentos podem sair da clínica. Sem isso,
`allowsHomeVisit` nasce `false` em tudo e a opção nunca aparece para ninguém.

## Passos

1. Na tela de tipos de tratamento, uma chave **"Pode ser em casa"** ao lado da
   que já existe para presencial.
2. O texto diz o efeito: *"Aparece como opção para o paciente ao marcar."*
3. `requiresInPerson` ganha a mesma frase — hoje ele decide o vídeo e a tela
   não diz isso.

## Arquivos afetados

- a tela de tipos de tratamento no painel
- `app/api/admin/treatment-types/[id]/route.ts`

## Critérios de aceite

- [ ] A chave salva e o app passa a oferecer na hora seguinte
- [ ] Desligar não mexe em consulta já aprovada
- [ ] As duas chaves explicam o efeito
