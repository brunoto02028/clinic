# Atividade 8 — Vídeos de exercício no Cloudflare R2

## Objetivo

Tirar os vídeos e thumbnails de exercício do disco do VPS e colocá-los no R2,
servidos por `media.bpr.clinic`.

Não é por custo nem por escala — nessa escala o disco do VPS dá conta. É por dois
problemas concretos que já se manifestaram:

**1. Os vídeos não têm backup nenhum.** O `scripts/backup.ps1` copia
`public/uploads` da máquina **local** do usuário, não do servidor. Os 296
arquivos que existiam em produção nunca entraram em backup algum. Disco do VPS
falha e o banco fica apontando para arquivos que não existem mais.

**2. O Cloudflare quebra vídeo no Safari.** Medido em produção: o mesmo arquivo
volta ora `video/mp4`, ora `application/octet-stream`, e o edge nunca devolve
`206` para requisição com `Range` — sempre `200`. O Chrome tolera porque fareja
o conteúdo; o Safari não, e é o relato de "não aparece no iPhone". Servindo do
R2 por domínio próprio, `Content-Type` e `Range` vêm corretos da origem certa e
o problema some na raiz, sem depender de regra de cache no painel.

**O momento é o melhor possível:** o reset deixou zero arquivos no disco. Não há
nada para migrar — só mudar para onde os próximos vão.

## Decisões de design

**1. Só vídeos e thumbnails de exercício.**
Artigos, logo, documentos de paciente e avatares continuam no disco do VPS.
Mover tudo de uma vez multiplicaria as rotas afetadas e traria arquivos
existentes para migrar. O que fica no disco passa a ser coberto pelo backup
corrigido (T-4).

**2. URL absoluta gravada no banco.**
`videoUrl` passa a ser `https://media.bpr.clinic/exercises/<arquivo>` em vez de
`/uploads/exercises/<arquivo>`. Todo consumidor usa `<video src={...}>` ou
`<img src={...}>`, que aceitam URL absoluta — **nenhuma tela muda**. É o que
torna esta migração barata.

**3. O ffmpeg continua rodando no servidor.**
Normalização e thumbnail precisam do arquivo em disco. O fluxo passa a ser:
grava em temporário → normaliza → gera thumbnail → sobe os dois para o R2 →
apaga o temporário. O disco do VPS vira área de passagem, não de armazenamento.

**4. Bucket público via domínio próprio.**
Confirmado que hoje `/uploads/*` já é público: o matcher do middleware exclui
qualquer caminho com extensão, então os vídeos nunca exigiram login. Bucket
público não é regressão de privacidade — é o mesmo nível de exposição de hoje.

**5. `app/uploads/[...path]` continua existindo.**
Ainda serve os uploads que permanecem no disco. Remover a rota quebraria
artigos e logo.

**6. Apagar exercício apaga o objeto no R2.**
Sem isso, o R2 vira o novo depósito de lixo — exatamente o problema que
acabamos de resolver no disco, onde 296 arquivos sobreviveram a todas as
exclusões pela tela.

## Suposições

| # | Suposição | Impacto se estiver errada |
|---|-----------|---------------------------|
| S1 | O usuário cria o bucket R2 e conecta `media.bpr.clinic` no painel | Nada funciona; é pré-requisito |
| S2 | Bucket público. Vídeo de exercício não é dado sensível — é o mesmo status de hoje | Precisaria de URL assinada e o cache do Cloudflare deixaria de ajudar |
| S3 | Um bucket só, prefixos `exercises/` e `exercises/thumbnails/` | Reorganizar depois exige mover objetos |
| S4 | Falha ao subir para o R2 **aborta** o upload em vez de cair no disco | Um fallback silencioso recriaria o problema de arquivo sem backup |
| S5 | Existe acesso SSH ao VPS a partir da máquina do usuário, para o backup dos uploads restantes | T-4 precisa de outro caminho (rota autenticada que empacota e devolve) |
| S6 | Os uploads que ficam no disco cabem num backup diário sem incomodar | Precisaria de backup incremental |

## Tarefas

| Tarefa | Nome | Status |
|--------|------|--------|
| T-1 | Cliente R2 e configuração | concluído (QA local ok) |
| T-2 | Upload de exercício grava no R2 | concluído (QA local ok) |
| T-3 | Exclusão remove o objeto no R2 | concluído (QA local ok) |
| T-4 | Backup passa a capturar os uploads de produção | pendente |
| T-5 | Verificação em produção e remoção das rotas temporárias | pendente |

T-1 → T-2 → T-3. T-4 é independente e pode sair antes.

## Pré-requisitos do usuário

Nada disso é código; sem isso a T-1 não roda.

1. Criar um bucket R2 (sugestão: `bpr-clinic-media`)
2. Conectar o domínio `media.bpr.clinic` ao bucket (**R2 → Settings → Custom Domains**)
3. Gerar um API Token do R2 com permissão de leitura e escrita
4. Passar: Account ID, Access Key ID, Secret Access Key, nome do bucket

As credenciais vão para as variáveis de ambiente no Coolify — **nunca** para o repositório.

## Fora do escopo

- Migrar artigos, logo, documentos e avatares (ficam no disco, cobertos pela T-4)
- URL assinada / vídeo protegido por login (ver S2)
- Transcodificação por resolução para 4G — conversa separada sobre qualidade vs. peso
- App Expo
- As correções pendentes da revisão: `playsInline`, PWA, alvo de toque do desfazer
