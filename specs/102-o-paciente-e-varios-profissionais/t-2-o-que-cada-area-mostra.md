# T-2: O que cada área mostra — módulos e vocabulário por tipo

**Status:** concluída (28/09/2026)
**Depende de:** T-1

## Objetivo

A área do médico não tem exercícios, protocolo de reabilitação nem escaneamento
de pés. A do nutricionista não tem prescrição de exercício. A do psicólogo não
tem exame de imagem. **Sem esconder tela no navegador:** o portão é no servidor.

## Contexto

`lib/module-registry.ts` tem 24 `mod_*` e `patientGate({ module })` recusa no
servidor. `lib/admin-sections.ts` já filtra seção e aba por
`clinicalOnly`/`personalOnly`. O que falta é trocar esses dois booleanos por
**um conjunto por tipo**, senão o quinto tipo vira o quinto booleano.

A varredura da [100 T-4](../100-o-caminho-ate-o-paciente/) tem de continuar
passando: uma tela que existe para um tipo e não tem caminho nele é a mesma
falha de antes, com uma desculpa nova.

## Passos

1. Um mapa `tipo → módulos`, num lugar só.
2. `admin-sections` passa a perguntar ao mapa, em vez de a dois booleanos.
3. Vocabulário: o médico fala "paciente" e "consulta"; o nutricionista fala
   "plano alimentar"; o psicólogo fala "sessão".
4. Um teste que, para cada tipo, abre **todas** as telas do menu dele e checa
   que nenhuma responde 403 — e que as de fora do tipo respondem.

## Critérios de aceite

- [x] Cada tipo vê só as suas seções, e o **middleware** recusa o resto por URL.
- [x] O menu da clínica e do estúdio é **byte a byte** o de antes, provado por
      teste que compara as duas chamadas.
- [x] Acrescentar um tipo é uma linha em `lib/painel-por-tipo.ts`.
- [x] Toda seção de um profissional **declara as abas** — sem lista, uma aba
      nova nasceria visível para ele.
- [x] As duas listas de rota (menu e portão) não podem divergir em silêncio:
      há teste que confronta uma com a outra.
