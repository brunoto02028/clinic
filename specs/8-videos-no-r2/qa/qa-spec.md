# QA — Atividade 8: Vídeos no R2

Local para o que dá para testar sem credencial real; produção para T-5, que é
onde o objetivo principal se prova.

Evidências em `qa/screenshots/`. Todo cenário de API registra comando e resposta
crua no report.

---

## T-1 — Cliente R2

| # | Tipo | Cenário | Passos | Esperado |
|---|------|---------|--------|----------|
| 1.1 | API | Sem configuração | Rodar sem as env vars | `isR2Configured()` false |
| 1.2 | API | Com configuração | Env vars presentes | true |
| 1.3 | API | Subir objeto | `uploadToR2("teste/a.mp4", buf, "video/mp4")` | Objeto acessível na URL pública |
| 1.4 | API | Content-Type | `curl -I` na URL do objeto | `video/mp4` |
| 1.5 | API | Apagar | `deleteFromR2` e recarregar | `404` |
| 1.6 | API | Apagar inexistente | `deleteFromR2("nao/existe")` | Não lança |
| 1.7 | API | Tabela única | Buscar `CONTENT_TYPES` no projeto | Uma definição só, importada nos dois lugares |
| 1.8 | UI | Uploads legados | Abrir imagem de artigo | Continua servindo pelo disco |

## T-2 — Upload

| # | Tipo | Cenário | Passos | Esperado |
|---|------|---------|--------|----------|
| 2.1 | UI | Upload individual | Novo Exercício com vídeo | `videoUrl` absoluto, começa com a base do R2 |
| 2.2 | UI | Bulk de uma pasta | Arrastar pasta com 3 vídeos | Os 3 no R2, na pasta escolhida |
| 2.3 | API | Thumbnail e duração | Ler o exercício criado | Ambos preenchidos; thumbnail responde `200` |
| 2.4 | API | **Range** | `curl -H "Range: bytes=0-99"` na URL do R2 | **`206`** + `Content-Range` + `Accept-Ranges` |
| 2.5 | API | Content-Type estável | 5 requisições seguidas | `video/mp4` nas 5, nunca `octet-stream` |
| 2.6 | API | Disco limpo | Listar uploads do VPS após o envio | Nenhum arquivo novo |
| 2.7 | API | Temporário apagado | Subir arquivo que o ffmpeg rejeita | Erro tratado e `os.tmpdir()` sem sobras |
| 2.8 | API | R2 fora do ar | Credencial inválida de propósito | Erro explícito; exercício **não** criado; nada no disco |
| 2.9 | API | Sem configuração | Remover env vars e tentar subir | Recusa com mensagem clara |
| 2.10 | UI | Paciente | Prescrever e abrir como paciente | Vídeo toca, `readyState 4` |
| 2.11 | UI | Isolamento | Contar todas as pastas antes e depois | Só a de destino muda |

## T-3 — Exclusão

| # | Tipo | Cenário | Passos | Esperado |
|---|------|---------|--------|----------|
| 3.1 | UI | Apagar exercício | Lixeira no card | Vídeo e thumbnail dão `404` no R2 |
| 3.2 | API | Banco coerente | Ler o exercício apagado | `videoUrl`/`thumbnailUrl` limpos, sem apontar para objeto morto |
| 3.3 | UI | Apagar pasta com vídeos | Excluir pasta e seus vídeos | Todos os objetos removidos |
| 3.4 | UI | Trocar vídeo | Editar e enviar outro arquivo | Novo funciona, antigo dá `404` |
| 3.5 | API | Falha ao apagar | Simular erro no R2 | Exclusão no banco acontece; erro registrado |
| 3.6 | API | Bucket vazio | Listar `exercises/` após apagar tudo | Zero objetos |

## T-4 — Backup

| # | Tipo | Cenário | Passos | Esperado |
|---|------|---------|--------|----------|
| 4.1 | — | Captura produção | Rodar `backup.ps1` | `prod-uploads/` com contagem igual à do servidor |
| 4.2 | — | Origens separadas | Inspecionar a pasta do backup | `local-uploads/` e `prod-uploads/` distintas |
| 4.3 | — | Falha visível | Derrubar o acesso de propósito | Relatório mostra **FAIL**, não OK |
| 4.4 | — | Manifesto | Ler `manifest.json` | Contagem por origem |
| 4.5 | — | Restauração | Extrair e abrir um arquivo | Abre íntegro |
| 4.6 | — | Banco intacto | Conferir `prod-db.sql` | SQL texto, > 1 MB, restaurável |

## T-5 — Produção

| # | Tipo | Cenário | Passos | Esperado |
|---|------|---------|--------|----------|
| 5.1 | API | Content-Type | 5 requisições sem sessão | `video/mp4` nas 5 |
| 5.2 | API | Range | `Range: bytes=0-99` | `206` + `Content-Range` |
| 5.3 | UI | Tocar e buscar | Navegador, pular para o meio | `seeked` dispara; `currentTime` avança |
| 5.4 | — | **iPhone** | **Usuário testa no aparelho** | Vídeo abre e toca no Safari |
| 5.5 | API | Disco | `filesOnDisk` do dry-run | Zero |
| 5.6 | API | Rotas removidas | `POST` nas duas temporárias | `404` |
| 5.7 | UI | Sem botão órfão | Abrir a biblioteca | Nenhum botão para rota removida |

---

## Regressão (ao fim da T-2 e da T-5)

| # | Cenário | Esperado |
|---|---------|----------|
| R.1 | Categoria → pasta → vídeos | Navegação e contagens corretas |
| R.2 | Prescrever pasta inteira | Cria N; repetir pula N |
| R.3 | Paciente agrupado por pasta | Seções recolhidas, uma por pasta |
| R.4 | Concluir e desfazer | Contador sobe e volta |
| R.5 | Uploads legados | Imagem de artigo e logo continuam abrindo |
| R.6 | Celular 390px | Sem rolagem horizontal |
