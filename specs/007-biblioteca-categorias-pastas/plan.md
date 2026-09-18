# Atividade 7 — Biblioteca de exercícios: Categoria → Pasta → Vídeos

## Objetivo

Acabar com os vídeos soltos na biblioteca. Hoje a primeira página mistura duas
coisas diferentes que parecem iguais: 3 pastas de verdade (Scoliosis, Sit a Lot,
Tennis Elbow) e 5 agrupamentos automáticos por região do corpo (Upper Limbs,
Lower Limbs, Spine, Core & Trunk, General) que contêm 116 vídeos sem pasta.

Os agrupamentos automáticos não podem ser renomeados, deletados nem reorganizados
— não existem no banco, são derivados do campo `bodyRegion`. É por isso que o
botão de excluir aparece em 3 cards e não nos outros 5, o que confunde no uso
diário.

Passa a existir uma hierarquia real de dois níveis, criada e nomeada pela clínica:

```
Categoria          Pasta               Vídeos
(Coluna)      →    (Scoliosis)    →    11 vídeos
                   (Hérnia)       →    18 vídeos
```

## Decisões de design

**1. Categoria e pasta são o mesmo modelo.**
`ExerciseFolder` ganha `parentId` (auto-relação). Sem pai = categoria; com pai =
pasta. Evita um segundo modelo quase idêntico, e o CRUD, a contagem e a
permissão já existentes valem para os dois.

**2. Profundidade travada em 2 níveis.**
A API rejeita criar uma pasta dentro de uma pasta. A auto-relação permitiria
aninhamento infinito, mas navegação profunda no celular é ruim e não foi pedida.
Se um dia precisar, o schema já suporta — é só afrouxar a validação.

**3. Vídeo mora em pasta, nunca em categoria.**
Uma categoria só contém pastas. Isso mantém a regra mental simples ("categoria é
gaveta, pasta é o que tem vídeo") e evita a tela ter que renderizar pasta e vídeo
lado a lado no mesmo nível.

**4. `folderId` continua opcional no schema.**
A obrigatoriedade é imposta na API e na tela, não no banco. Tornar a coluna
`NOT NULL` quebraria qualquer linha órfã que aparecesse por um caminho não
previsto (import, seed, restauração de backup antigo) e derrubaria a query
inteira. Em vez disso, a tela mostra um card **"Sem categoria"** se algum vídeo
aparecer solto — visível e corrigível, em vez de invisível.

**5. `bodyRegion` deixa de organizar a grade e vira só filtro.**
O campo continua no modelo e no formulário (é útil para buscar "tudo de ombro"
atravessando categorias), mas não desenha mais os cards. É a mudança que elimina
a ambiguidade do item anterior.

**6. Apagar categoria segue o padrão que já existe para pasta.**
Diálogo com escolha explícita, igual ao de hoje: apagar só a categoria (as pastas
sobem para a raiz) ou apagar com todo o conteúdo. Reaproveita o componente que já
está no ar e que o usuário já conhece.

**7. Reset da biblioteca é rota temporária, não botão permanente.**
Apagar 147 exercícios e os arquivos do disco é uma operação de uma vez só, não um
recurso. Vira rota `SUPERADMIN` com `?dryRun` e `?confirm=DELETE-ALL`, e é
removida num commit seguinte — mesmo ciclo já usado em `backfill-duration` e
`normalize-videos`.

## Suposições

Cada uma destas eu decidi sozinho. Se alguma estiver errada, é melhor corrigir
agora do que depois de implementada.

| # | Suposição | Impacto se estiver errada |
|---|-----------|---------------------------|
| S1 | Uma clínica só. O fallback de `clinicId` para "Global View" já existente continua servindo. | Categorias vazariam entre clínicas |
| S2 | Nomes de categoria/pasta são únicos **dentro do mesmo pai** — pode existir "Geral" em duas categorias diferentes | Renomear pode colidir |
| S3 | Deletar categoria com pastas dentro pergunta o que fazer; não deleta em silêncio | Perda de dados |
| S4 | O Bulk Upload sobe uma pasta do computador por vez, para uma pasta-destino só | Precisaria mapear subpastas do disco → pastas do sistema |
| S5 | Prescrever continua sendo por pasta ou por vídeo, **não** por categoria inteira | Faltaria "prescrever categoria" |
| S6 | Os 147 exercícios atuais são descartáveis (decisão já confirmada) | Perda irreversível |
| S7 | A área do paciente agrupa por **pasta** (folha), sem mostrar a categoria | Paciente veria hierarquia demais no celular |

## Tarefas

| Tarefa | Nome | Status |
|--------|------|--------|
| T-1 | Schema: `parentId` em ExerciseFolder | concluído (QA ok, aguarda review) |
| T-2 | API de pastas com hierarquia (criar/mover/renomear/apagar) | concluído (QA ok, aguarda review) |
| T-3 | Tela: navegação em 3 níveis e ações de categoria | concluído (QA ok, aguarda review) |
| T-4 | Bulk Upload escolhendo categoria + pasta de destino | concluído (QA ok, aguarda review) |
| T-5 | Reset da biblioteca (rota temporária) e re-upload | pendente |
| T-6 | Remover a rota de reset | pendente |

Ordem obrigatória: T-1 → T-2 → T-3 antes do T-5. Apagar a biblioteca antes da
estrutura nova existir faria o usuário subir tudo outra vez no formato antigo.

## Fora do escopo

- App Expo (`mobile/`) — a tela de exercícios continua lista plana; combinado
  anteriormente de tratar em atividade separada
- Prescrever uma categoria inteira de uma vez (ver S5)
- Preencher séries/repetições/instruções dos vídeos — é conteúdo, não código,
  e hoje **147 de 147** estão vazios
- Corrigir `playsInline`, PWA e alvo de toque do desfazer — achados da revisão
  anterior, viram atividade própria para não inchar esta
