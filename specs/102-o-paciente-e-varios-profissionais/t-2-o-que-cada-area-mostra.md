# T-2: O que cada área mostra — módulos e vocabulário por tipo

**Status:** pendente
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

- [ ] Cada tipo vê só as suas seções, e o servidor recusa o resto.
- [ ] Nenhuma tela no menu de um tipo dá erro nesse tipo.
- [ ] O personal trainer continua exatamente como está.
- [ ] Acrescentar um sexto tipo é uma linha no mapa.
