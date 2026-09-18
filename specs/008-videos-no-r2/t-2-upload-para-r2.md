# T-2: Upload de exercício grava no R2

**Status:** concluído (QA local aprovado, aguardando review e deploy)
**Depende de:** T-1

## Objetivo

Os três caminhos que criam exercício passam a gravar o vídeo e a thumbnail no
R2, e a guardar a URL absoluta no banco.

## Contexto

Decisões 2, 3 e 4 do plano. O ffmpeg exige arquivo em disco, então o disco vira
área de passagem: grava temporário → normaliza → thumbnail → sobe → apaga.

Zero arquivos em produção hoje, então não há convivência de formatos antigos e
novos para administrar.

## Passos

1. Extrair a sequência repetida nas três rotas para um helper
   `processAndStoreExerciseVideo(file, originalName)` em `lib/exercise-media.ts`:
   - grava em diretório temporário (`os.tmpdir()`)
   - `ensureWebSafeVideo` (H.264/yuv420p/mp4/faststart)
   - `generateVideoThumbnail` + `getVideoDuration`
   - `uploadToR2("exercises/<nome>", ...)` e
     `uploadToR2("exercises/thumbnails/<nome>", ...)`
   - apaga os temporários **inclusive em caso de erro** (`finally`)
   - devolve `{ videoUrl, thumbnailUrl, duration }` com URLs absolutas

2. Aplicar em `app/api/admin/exercises/route.ts` (POST),
   `.../bulk/route.ts` e `.../instagram/route.ts`.

3. **Sem fallback para o disco.** Se o R2 falhar, a resposta é erro e o
   exercício não é criado (S4). Cair no disco em silêncio recriaria o arquivo
   sem backup que motivou esta atividade — e o usuário não teria como saber.

4. Se `isR2Configured()` for false, recusar o upload com mensagem clara em vez
   de gravar no disco por acidente.

5. `app/api/admin/exercises/[id]/route.ts` (PATCH) — trocar vídeo também vai
   para o R2, e o objeto antigo é removido (ver T-3).

## Arquivos afetados

- `lib/exercise-media.ts` (novo)
- `app/api/admin/exercises/route.ts`
- `app/api/admin/exercises/[id]/route.ts`
- `app/api/admin/exercises/bulk/route.ts`
- `app/api/admin/exercises/instagram/route.ts`

## Critérios de aceite

- [ ] Upload individual grava no R2 e `videoUrl` começa com `https://media.`
- [ ] Bulk upload de uma pasta grava todos no R2, na pasta escolhida
- [ ] Thumbnail e duração continuam sendo gerados
- [ ] O vídeo servido pelo R2 responde `200` com `Content-Type: video/mp4`
- [ ] Requisição com `Range` responde **`206`** com `Content-Range` — o ponto
      central da atividade
- [ ] Nenhum arquivo sobra no disco do VPS após o upload
- [ ] Temporários apagados mesmo quando o ffmpeg falha
- [ ] R2 fora do ar → erro explícito, exercício não criado, nada no disco
- [ ] O vídeo toca na área do paciente sem alteração de tela
