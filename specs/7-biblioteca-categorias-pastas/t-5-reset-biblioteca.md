# T-5: Reset da biblioteca e re-upload

**Status:** pendente
**Depende de:** T-3, T-4

## Objetivo

Apagar os 147 exercícios, as 3 pastas e os arquivos de vídeo do disco, para que a
clínica suba tudo de novo já dentro da estrutura Categoria → Pasta.

## Contexto

Decisão 7 do plano e S6. O usuário confirmou que os 147 atuais são descartáveis.

A tela não consegue fazer isso: os 116 vídeos soltos não estão em pastas, não
existe "selecionar todos", e o delete só marca `isActive: false` — os `.mp4`
continuariam no disco, dobrando o espaço depois do re-upload.

**Só roda depois de T-3 e T-4 estarem em produção.** Apagar antes faria o
re-upload cair no formato antigo.

O código já está escrito e compilando na branch `feat/reset-exercise-library`.

## Passos

1. Backup fresco de produção (`scripts/backup.ps1`) — precisa ser rodado pelo
   usuário, `PROD_DATABASE_URL` só existe no perfil PowerShell dele.
2. Verificar que o dump é restaurável: texto SQL, não UTF-16.
3. Deploy da rota `app/api/admin/exercises/reset-library/route.ts`.
4. Rodar `?dryRun=true` e **mostrar os números ao usuário** antes de qualquer
   escrita.
5. Com o OK, rodar `?confirm=DELETE-ALL&purgeOrphans=true`.
6. Conferir: biblioteca vazia na tela, `filesRemaining: 0`, site no ar.
7. Usuário sobe as pastas pelo Bulk Upload novo.

## Arquivos afetados

- `app/api/admin/exercises/reset-library/route.ts` (novo, temporário)

## Critérios de aceite

- [ ] Backup de produção feito **antes**, e verificado como restaurável
- [ ] `?dryRun=true` não escreve nada e os números batem com a tela (147/3)
- [ ] Sem `?confirm=DELETE-ALL` a rota recusa com `400`
- [ ] Rota recusa quem não é `SUPERADMIN`
- [ ] Depois de rodar: 0 exercícios, 0 pastas, `filesRemaining: 0`
- [ ] `/api/health` continua `healthy` e a tela abre vazia sem erro
- [ ] Prescrições do Eduardo somem junto (esperado — cascade)
