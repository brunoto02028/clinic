# T-7: Suíte automatizada de isolamento

**Status:** pendente
**Trilha:** PLATAFORMA
**Depende de:** T-6

## Objetivo
Transformar os cenários ISO-* (e o X1) da atividade 19 num teste que roda com um comando. Assim, qualquer mudança futura que reabra um vazamento é pega antes do push.

## Passos
1. `tests/tenant-isolation/`:
   - um script (Node + Playwright, que já estão no projeto) sobe os fixtures;
   - faz login como cada ator e roda os cenários;
   - limpa e sai com código ≠ 0 se algum vazar.
2. Criar o `npm run test:tenants` (sem dependência nova).
3. Documentar no plan.md que o comando roda antes de qualquer push.

## Critérios de aceite
- [ ] A suíte passa no código corrigido.
- [ ] Revertendo de propósito uma checagem, a suíte falha apontando o cenário.
