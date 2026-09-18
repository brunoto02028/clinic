# T-4: Backup passa a capturar os uploads de produção

**Status:** pendente
**Depende de:** nenhuma (pode sair antes das outras)

## Objetivo

O backup diário passa a incluir os arquivos que ficam no disco do VPS.

## Contexto

Este é o furo mais sério encontrado, e é anterior ao R2.

`scripts/backup.ps1` linha 113 faz:

```powershell
$uploadsDir = Join-Path $ProjectRoot "public\uploads"
```

Isto é a pasta `public/uploads` **da máquina do usuário**, não do servidor. O
backup de hoje registrou "uploads/ (13 files)" enquanto produção tinha **296**.
Nenhum arquivo de produção jamais entrou em backup — o nome no relatório
sugeria o contrário, que é o pior tipo de falha: silenciosa e tranquilizadora.

Depois da T-2 os vídeos de exercício estarão no R2 (replicado pela Cloudflare),
mas **artigos, logo, documentos de paciente e avatares continuam só no disco**.
São esses que esta tarefa protege.

## Passos

1. Verificar se há acesso SSH ao VPS a partir da máquina do usuário (S5).
   Se houver: `rsync`/`scp` de `/root/clinic-uploads` para a pasta do backup.
   Se não houver: implementar rota `GET /api/admin/backup/uploads` restrita a
   `SUPERADMIN` que devolve um `.tar.gz` do diretório, e o script baixa.
   **Decidir com o usuário antes de implementar** — não adivinhar.
2. Renomear a seção local para deixar explícito o que é o quê:
   `local-uploads/` e `prod-uploads/`. O nome genérico foi o que escondeu o
   problema.
3. Se a captura de produção falhar, o relatório do backup precisa dizer
   **FAIL** de forma visível, não "OK" com contagem da pasta errada.
4. Acrescentar ao manifesto quantos arquivos vieram de cada origem.
5. Atualizar `BACKUP_GUIDE.md`, se existir, com o que passa a estar coberto e
   o que não está.

## Arquivos afetados

- `scripts/backup.ps1`
- `app/api/admin/backup/uploads/route.ts` (novo, só no caminho sem SSH)
- `BACKUP_GUIDE.md`

## Critérios de aceite

- [ ] O backup captura os uploads **de produção**, com contagem conferindo com
      o servidor
- [ ] Local e produção ficam em pastas separadas e nomeadas
- [ ] Falha na captura de produção aparece como FAIL, não como OK
- [ ] `manifest.json` registra a contagem de cada origem
- [ ] Restauração testada: extrair e conferir que um arquivo abre
- [ ] O backup do banco continua funcionando como hoje
