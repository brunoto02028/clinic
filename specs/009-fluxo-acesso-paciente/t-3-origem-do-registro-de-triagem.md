# T-3: Parar a criação de triagem por efeito colateral

**Status:** concluído
**Depende de:** T-2

## Objetivo

Que só a triagem crie registro de triagem. Hoje uma funcionalidade de
acompanhamento cria ficha clínica sem que ninguém tenha respondido nada.

## Contexto

`app/api/patient/outcome-measures/route.ts:119` cria um `MedicalScreening`
quando não existe, apenas para guardar uma nota de dor (`painLevel`,
`painScore`, `redFlagDetails`).

O paciente registra a dor e ganha um prontuário de triagem que ninguém
preencheu. Combinado com o bug da T-2, ele passa a aparecer como triado.

O dado de dor precisa continuar sendo guardado — o que está errado é o *lugar*.

## Passos

1. Mapear quem lê `painLevel` / `painScore` / `redFlagDetails` a partir do
   `MedicalScreening`, para não quebrar leitor existente.
2. Decidir o destino: campo próprio no modelo de outcome measures, ou manter em
   `MedicalScreening` mas **só atualizando** registro existente, nunca criando.
   A segunda é menos invasiva e resolve o sintoma.
3. Varrer os outros pontos de criação e confirmar que cada um representa uma
   triagem de verdade.
4. Verificar em produção se algum registro atual nasceu por esse caminho —
   sinal: `painLevel` preenchido com o resto do formulário vazio.

## Arquivos afetados

- `app/api/patient/outcome-measures/route.ts`
- possivelmente `prisma/schema.prisma`

## Critérios de aceite

- [ ] Registrar nota de dor num paciente sem triagem **não** cria triagem
- [ ] A nota de dor continua sendo guardada e visível onde já aparecia
- [ ] Paciente sem triagem continua aparecendo como não triado depois de registrar dor
- [ ] Nenhum registro existente foi apagado
