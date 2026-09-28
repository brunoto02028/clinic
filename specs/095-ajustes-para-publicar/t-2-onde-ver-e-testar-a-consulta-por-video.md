# T-2: Onde ver, e como testar, uma consulta por vídeo

**Status:** feita (27/09) — em QA
**Depende de:** nenhuma

## Objetivo

Deixar óbvio, do painel, **quais consultas são por vídeo**, como marcar uma, e
como fazer um teste de ponta a ponta sem depender de um paciente de verdade.

## Contexto

O Bruno não achou. E o caminho existe:

- `/admin/appointments` cria consulta com modo **vídeo** (o formulário tem o
  botão), mostra o selo "Por vídeo", o ícone no calendário, e os botões
  **Entrar** e **Chamar paciente** — estes só na consulta de quem está logado.
- `/admin/video-consultations` é a tela dedicada.

Duas coisas explicam não ter achado: as consultas existentes são presenciais
(então não há selo nenhum para ver), e os botões só aparecem para o **terapeuta
daquela consulta** — um admin que não atende não vê nada.

O que falta não é funcionalidade, é **caminho**: uma tela que só tem conteúdo
quando alguém já marcou vídeo não ensina ninguém a marcar.

## Passos

1. Em `/admin/video-consultations`, quando não houver nenhuma: dizer como criar
   uma, com link para a agenda e para o campo de modo — em vez de lista vazia.
2. Na agenda, deixar o seletor presencial/vídeo visível também na **edição** de
   uma consulta existente (hoje só na criação), para transformar uma já marcada.
3. Um filtro "só por vídeo" na agenda.
4. Um **modo de teste**: botão que cria uma consulta por vídeo daqui a cinco
   minutos com um paciente de teste identificado, para o Bruno abrir dos dois
   lados. Nunca com paciente real.
5. Escrever `specs/095-ajustes-para-publicar/como-testar-video.md`: o roteiro de
   ponta a ponta — marcar, chamar, entrar pelo painel, entrar pelo app.

## Arquivos afetados

- `app/admin/video-consultations/page.tsx`
- `app/admin/appointments/page.tsx` (edição e filtro)
- `app/api/admin/appointments/[id]/route.ts` (aceitar mudança de modo)
- `specs/095-ajustes-para-publicar/como-testar-video.md` (novo)

## Critérios de aceite

- [ ] Sem nenhuma consulta por vídeo, a tela ensina a criar uma
- [ ] Dá para virar uma consulta já marcada para vídeo
- [ ] A agenda filtra por vídeo
- [ ] Existe um caminho de teste que não usa paciente real
- [ ] O roteiro está escrito e foi seguido uma vez, do começo ao fim

---

## O que mudou

| passo | como ficou |
|---|---|
| 1 | A tela vazia diz **os dois caminhos** — agendar ali, ou abrir a consulta na agenda e mudar o formato — e explica a janela da sala, que é o que mais confunde |
| 2 | **O formato entrou na edição.** A rota `PUT /api/appointments/[id]` aceita `mode`, validado, e a guarda do paciente continua recusando tudo que não seja cancelar |
| 3 | Filtro **"Só por vídeo"** na agenda, com a contagem ao lado — porque "tenho alguma hoje?" é a pergunta mais comum |
| 4 | **"Test it now"**: preenche a hora para daqui a cinco minutos (a sala abre dez antes, então já nasce aberta), duração 30 e o tipo `TEST — video call`. **Não inventa paciente** — quem escolhe é quem clica, porque QA usa paciente de teste *identificado* |
| 5 | Roteiro de ponta a ponta em [como-testar-video.md](como-testar-video.md), incluindo o que fazer quando não funciona |

**O que eu não fiz, e por quê:** o atalho de teste não cria um paciente. Um botão
que cria gente encheria a lista de nomes que não existem, e seria eu decidindo
qual paciente é de teste — decisão de quem conhece a clínica.
