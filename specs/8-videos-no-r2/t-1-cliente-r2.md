# T-1: Cliente R2 e configuração

**Status:** concluído (QA local aprovado, aguardando review e deploy)
**Depende de:** nenhuma (mas exige as credenciais do usuário)

## Objetivo

Um módulo que sobe, apaga e monta URL de objetos no R2, e que diz claramente
quando não está configurado.

## Contexto

`@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner` já estão instalados —
o projeto usa S3 para foot scans e fotos de avaliação. O R2 é compatível com S3;
a diferença é `endpoint` apontando para
`https://<accountId>.r2.cloudflarestorage.com` e `region: "auto"`.

`lib/s3.ts` **não** serve: ele monta URL da AWS (`s3.<region>.amazonaws.com`) e
não aceita endpoint customizado. Mexer nele arriscaria foot scans e avaliações,
que estão funcionando. Módulo separado.

## Passos

1. Criar `lib/r2.ts`:
   - Cliente `S3Client` com `region: "auto"`, `endpoint` do R2 e credenciais das
     env vars
   - `isR2Configured()` — todas as variáveis presentes
   - `uploadToR2(key, body, contentType)` 
   - `deleteFromR2(key)` — silencioso se o objeto não existir
   - `r2PublicUrl(key)` → `${R2_PUBLIC_URL}/${key}`
2. Variáveis de ambiente (Coolify, nunca no repo):
   - `R2_ENDPOINT` — `https://<accountId>.r2.cloudflarestorage.com`
   - `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME` — ex.: `bpr-clinic-media`
   - `R2_PUBLIC_URL` — ex.: `https://media.bpr.clinic`

   Estes são os nomes que já estavam configurados no Coolify quando as
   credenciais chegaram. O código seguiu a configuração existente em vez de
   exigir que ela fosse refeita.
3. `contentType` derivado da extensão, reaproveitando a tabela que já existe em
   `app/uploads/[...path]/route.ts` — extrair para `lib/content-types.ts` para
   não haver duas listas divergindo (foi exatamente uma lista faltando `.mp4`
   que originou o bug do `octet-stream`).
4. Documentar as variáveis no `.env.example` se existir.

## Arquivos afetados

- `lib/r2.ts` (novo)
- `lib/content-types.ts` (novo, extraído)
- `app/uploads/[...path]/route.ts` (passa a importar a tabela)

## Critérios de aceite

- [ ] `isR2Configured()` false sem as variáveis, true com elas
- [ ] `uploadToR2` grava e o objeto fica acessível na URL pública
- [ ] `Content-Type` do objeto no R2 é `video/mp4` para `.mp4`
- [ ] `deleteFromR2` remove, e não lança erro se o objeto já não existe
- [ ] `/uploads/*` continua servindo os arquivos que ficaram no disco
- [ ] `npx next build` compila
