# Relatório de QA — T-1 a T-3 (antes do deploy)

**Data:** 2026-08-13
**Ambiente:** local (`npm run dev` na porta 4000) contra o **R2 de produção real**
**Vídeos:** os do usuário, de `Videos Paciente/Scoliosis` (1,6 MB cada, H.264/720p)
**Build:** `npx next build` → `✓ Compiled successfully`

---

## Conectividade (pré-requisito)

| Operação | Resultado |
|----------|-----------|
| PUT | ok |
| GET | ok, `Content-Type` preservado |
| URL pública `media.bpr.clinic` | `200`, corpo correto |
| LIST | ok |
| DELETE | ok, URL passa a `404` |

## T-1 — Cliente R2

| # | Cenário | Resultado |
|---|---------|-----------|
| 1.1/1.2 | `isR2Configured()` | false sem as variáveis, true com elas |
| 1.3 | Subir objeto | Acessível na URL pública |
| 1.4 | Content-Type | `video/mp4` para `.mp4` |
| 1.5 | Apagar | `404` depois |
| 1.6 | Apagar inexistente | Não lança |
| 1.7 | Tabela única | `lib/content-types.ts`, importada pela rota `/uploads` |
| 1.8 | Uploads legados | `/uploads/*` continua servindo o disco |

## T-2 — Upload

Enviados 3 vídeos reais por `Bulk Upload` → `R2 Teste Coluna › R2 Teste Scoliosis`.

**Resultado na tela: `3 of 3 uploaded successfully`.**

| Vídeo | URL | Thumb | Duração |
|-------|-----|-------|---------|
| 001 | `media.bpr.clinic/exercises/1786628036430-001.mp4` | sim | 16s |
| 002 | `…/1786628041717-002.mp4` | sim | 14s |
| 003 | `…/1786628046125-003.mp4` | sim | 8s |

### O ponto central da atividade

```
Content-Type em 5 tentativas seguidas:
  video/mp4
  video/mp4
  video/mp4
  video/mp4
  video/mp4          ← estável, nunca application/octet-stream

Range: bytes=0-99
  HTTP/1.1 206 Partial Content      ← era 200 antes
  content-range: bytes 0-99/1717712
  Content-Length: 100
```

Comparação com o que foi medido em produção antes da migração: o mesmo arquivo
alternava entre `video/mp4` e `application/octet-stream`, e `Range` sempre
devolvia `200` sem `Content-Range`. É a causa do vídeo não abrir no iPhone.

### Reprodução no navegador

`readyState: 4`, duração 16,23s. **Seek para 10s levou 70ms** — só possível
porque o servidor honra `Range`; sem isso o navegador baixaria o arquivo inteiro.

### Disco

| Momento | Arquivos em `public/uploads/exercises` |
|---------|----------------------------------------|
| Antes | 5 (resquício de testes de 11:15) |
| Depois de 3 uploads | 5 — **nenhum novo** |
| Temporários `bpr-video-*` | 0 |

## T-3 — Exclusão

| # | Cenário | Resultado |
|---|---------|-----------|
| 3.1 | Apagar exercício | `removedMedia: 2`; vídeo e thumb passam a `404` |
| 3.2 | Banco coerente | `videoUrl`/`thumbnailUrl` limpos |
| 3.3 | Apagar categoria com vídeos | `deletedExercises: 2, deletedFolders: 2` |
| 3.6 | Bucket vazio | **`objetos no bucket: 0`** |

## O cenário que o plano chama de inegociável

Reiniciei o servidor com credencial inválida de propósito (S4 do plano: falha
no R2 **aborta**, nunca cai no disco em silêncio).

```
resultado : { success: false, error: "Credential access key has length 27, should be 32" }
exercício criado : não
arquivos no disco : 5 antes → 5 depois
temporários       : 0
```

Um fallback silencioso aqui recriaria exatamente o arquivo-sem-backup que
motivou a migração, e ninguém perceberia até um disco falhar.

## Achado: CORS não está configurado no bucket

`fetch()` do navegador para `media.bpr.clinic` a partir de outra origem é
bloqueado por CORS.

**Não afeta o aplicativo** — `<video src>` e `<img src>` não exigem CORS, e é
só isso que o código usa; a reprodução e o seek foram verificados e funcionam.
Afetou apenas o meu teste, que passou a medir pelo servidor.

Fica registrado porque, se algum dia algo precisar ler o vídeo por JavaScript,
será preciso adicionar a regra de CORS no bucket.

## Não testado nesta rodada

- **T-4** (backup dos uploads de produção) — depende da resposta sobre SSH
- **T-5** (verificação em produção) — depende do deploy
- **iPhone real** — não tenho como emular Safari; fica para o usuário confirmar

---

# Rodada 2 — correções do code review

O review (`/code-review high`) apontou 13 achados. Todos tratados.

## Destruição irreversível de dados (os dois mais graves)

| # | Achado | Correção |
|---|--------|----------|
| A1 | `?purgeOrphans=true` varria **todo** o prefixo `exercises/` mesmo com escopo de uma clínica. As chaves do R2 não têm segmento de clínica, então um SUPERADMIN da clínica A apagaria os vídeos ativos das clínicas B e C — e o R2 é agora a única cópia | "Órfão" passou a significar *nenhuma linha sobrevivente aponta para ele*: monta o conjunto de chaves ainda referenciadas e pula essas. O dry-run passou a reportar `objectsInR2Total` e `objectsInR2ThisScope` separados |
| A2 | `DELETE` e `PATCH` de exercício não checavam `clinicId`. Antes invertiam um booleano reversível; agora apagam o objeto do bucket permanentemente | Checagem contra `resolveClinicId(session)` nos dois; id de outra clínica devolve `404` |

## Ordem das operações

| # | Achado | Correção |
|---|--------|----------|
| A3 | A mídia era apagada **antes** do `update`. Se o banco falhasse, o vídeo já não existia e a linha continuava ativa apontando para URL morta | Banco primeiro, R2 depois. O pior caso vira um objeto sobrando, não um vídeo perdido |
| A4 | Mesma inversão na exclusão de pasta, em lote — uma pasta inteira ficaria ativa com vídeos inexistentes | URLs lidas antes, objetos apagados depois do `updateMany` |
| A7 | Falha no `create` deixava vídeo e thumbnail órfãos no R2 | `discardStoredMedia()` no catch das três rotas; no bulk é por item |

## O achado que reintroduzia o bug original

| # | Achado | Correção |
|---|--------|----------|
| A5 | `.avi`, `.mpeg` e `.mpg` são aceitos pelas rotas mas não existiam em `CONTENT_TYPES`. Quando a normalização falha, o arquivo sobe com a extensão original → objeto gravado como `application/octet-stream` **permanentemente** — exatamente a falha do Safari que esta atividade existe para corrigir, e irrecuperável sem novo upload | Os três tipos acrescentados |

## Demais

| # | Achado | Correção |
|---|--------|----------|
| A6 | Thumbnail automático virava órfão quando havia um manual no mesmo request | `processAndStoreExerciseVideo(..., { extractThumbnail: false })` quando o request traz o seu |
| A8 | Pico de memória dobrado: `arrayBuffer` (500MB) + `readFile` (mais 500MB) | `uploadStreamToR2` com `createReadStream` e `ContentLength` do `stat` |
| A9 | Thumbnail no `PATCH` sem validação de tipo nem tamanho, indo para domínio público (SVG incluído) | `ALLOWED_THUMBNAIL_TYPES` (jpeg/png/webp) e `MAX_THUMBNAIL_BYTES` (5MB), aplicados no `POST` e no `PATCH` |
| A10 | `MediaStorageError` caía no catch genérico do `PATCH` — mensagem inútil justamente no erro mais provável | Tratado como no `POST` |
| A11 | Nomes das variáveis divergiam da spec | A **spec** foi alinhada ao código: `R2_ENDPOINT`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` são os nomes já configurados no Coolify. Refazer a configuração seria risco sem ganho |
| A12 | `isR2Url` usava `startsWith`, casando `https://media.exemplo.com.atacante.net/x` | Comparação de origem via `new URL()` |
| A13 | Sobras: `writeFile` importado sem uso, `exercisesDir` órfão, `finalName` duplicando `stored.videoFileName`, e `storeExerciseVideoFromPath` exportado e nunca chamado | Todos removidos |

## Regressões que eu já tinha corrigido antes do review

Encontradas procurando por suposições sobre o formato da URL:

- `startsWith("/uploads")` em 3 pontos de `app/admin/exercises/page.tsx` classificaria um vídeo nosso como "link externo" agora que as URLs são absolutas. Substituído por `isEmbeddedVideoUrl` (YouTube/Vimeo), que expressa a intenção real. Um dos três (`isExternal`) estava declarado e nunca usado
- `media.bpr.clinic` faltava em `remotePatterns` do `next.config.js`

## Build

```
build limpo, sem dev server:  exit=0, ✓ Compiled successfully
```

Um build intermediário deu `exit=1` com `PageNotFoundError` e erros de `<Html>`.
Era a corrupção conhecida do `.next` no Windows por rodar `next build` com o
`npm run dev` ativo — reproduzido e descartado matando o dev e refazendo.
Não é defeito do código.

## Ainda não re-testado após estas correções

As correções são extensas e mudam caminhos de exclusão. **O QA funcional
precisa ser repetido** (upload, exclusão, rollback) antes do deploy.

---

# Rodada 3 — re-teste após as correções do review

As correções mexeram em todos os caminhos de exclusão, então o QA funcional foi
repetido inteiro.

## Upload continua funcionando (agora por streaming)

Subidos 2 vídeos reais de `Videos Paciente/Hip` → `2 of 2 uploaded successfully`.

| | |
|---|---|
| `Content-Type` | `video/mp4` |
| `Range: bytes=0-99` | **`206`**, `content-range: bytes 0-99/1934795` |
| Arquivo servido pelo R2 | h264 / yuv420p / 15,1s |
| Átomos | `ftyp moov free mdat` → **faststart preservado** |

A troca de `readFile` por `createReadStream` (achado A8) não corrompeu nada: o
arquivo difere do original em 117 bytes, que é o remux reescrevendo o container,
e o `ffprobe` confirma vídeo válido.

## A correção do achado mais grave, provada

Cenário montado à mão: um objeto no R2 pertencente a **outra clínica**
(`exercises/OUTRA-CLINICA.mp4`), com a linha correspondente na clínica
`cmspbifpx…`.

```
dry-run:
  objectsInR2Total     : 5
  objectsInR2ThisScope : 4     ← separação que não existia antes

execução (?confirm=DELETE-ALL&purgeOrphans=true, escopo de uma clínica):
  scope                : "this clinic only"
  objetos apagados     : 4
  órfãos purgados      : 0
  objectsRemainingInR2 : 1
```

Verificação independente:

```
https://media.bpr.clinic/exercises/OUTRA-CLINICA.mp4  →  200
15 exercício(s) intactos na outra clínica
```

**Na versão anterior esse vídeo teria sido destruído**, junto com todos os
demais das outras clínicas, sem aviso e sem cópia.

## Limpeza

Bucket zerado (`objetos restantes: 0`), linha de teste removida, artefatos
locais apagados.

---

# T-4 — Backup dos uploads de produção

## O SSH não funciona

```
$ ssh -o BatchMode=yes root@86.48.18.88
root@86.48.18.88: Permission denied (publickey,password).
```

Cliente e chave existem (`id_ed25519`), mas a pública nunca foi autorizada no
servidor. Isso resolve a suposição S5 do plano pelo caminho alternativo.

## Desenho escolhido

Rota `GET /api/admin/backup/uploads`, restrita a `SUPERADMIN`, devolvendo o
**manifesto** dos arquivos no disco do servidor. O script baixa cada um por
`/uploads/*`, que já os serve publicamente — o endpoint não acrescenta
exposição, apenas diz o que existe.

Não foi gerado um `.tar.gz` porque a biblioteca `tar` só está presente como
dependência transitiva, não declarada; depender disso quebraria num
`npm install` qualquer. Baixar arquivo a arquivo ainda sobrevive a uma
interrupção e informa qual falhou.

## Testes

| # | Cenário | Resultado |
|---|---------|-----------|
| 4.1 | Manifesto | `200`, 8 arquivos, 1 MB, caminhos relativos |
| 4.2 | Conteúdo | Inclui documento de paciente, logo, imagens — o que fica fora do R2 |
| 4.3 | Sem sessão | `307` para o login (middleware barra antes da rota) |
| — | Sintaxe do PowerShell | `Parser::ParseFile` sem erros |
| — | Build | `exit=0`, rota registrada |

## Mudanças no `scripts/backup.ps1`

- `uploads/` virou **`local-uploads/`** — o nome genérico era o que escondia o
  problema, sugerindo que os arquivos do servidor estavam salvos
- Nova seção **`prod-uploads/`**, baixando do servidor
- Contagem conferida contra o manifesto; divergência é **FAIL** visível, com os
  primeiros arquivos que falharam
- `manifest.json` passou a registrar `localUploadFiles`, `prodUploadFiles`,
  `prodUploadExpected` e `prodUploadComplete`
- Nota explícita de que os vídeos de exercício estão no R2 e não neste arquivo

## Pendente do usuário

`$env:PROD_SESSION_COOKIE` no perfil do PowerShell, com o cookie de sessão de
uma conta SUPERADMIN em produção. Sem ele a seção de produção falha — de forma
visível, que é o comportamento correto.

Não testado ponta a ponta contra produção: a rota ainda não foi implantada.
