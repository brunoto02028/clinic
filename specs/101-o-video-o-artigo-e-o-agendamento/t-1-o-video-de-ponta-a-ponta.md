# T-1: A consulta por vídeo, de ponta a ponta

**Status:** concluída (28/09/2026)
**Depende de:** nenhuma

## Objetivo

Percorrer a consulta por vídeo inteira — servidor, painel da clínica, sala na
web e tela do app — e consertar o que impede alguém de usá-la. O Bruno: *"eu não
vi essa parte do vídeo funcionando ainda"*.

## Contexto

A máquina existe desde a [089](../089-a-voz-e-a-cara/): sala privada na Daily,
token por pessoa preso à janela do horário, push para chamar o paciente, e a
tela no app com o SDK nativo. O QA da 089 T-8 já tinha consertado a agenda.

A hipótese que eu levei para esta tarefa — *"o Bruno leva 404 porque não é o
terapeuta da consulta"* — **estava errada**: `/api/admin/appointments` grava
`therapistId = quem criou`, então toda consulta que ele marca é dele. O que
estava quebrado era outra coisa, e são cinco coisas.

## Passos

1. Medir a matriz de recusas do servidor contra a Daily **de verdade**, não
   contra mock.
2. Abrir o painel logado como terapeuta e olhar o que a tela oferece.
3. Abrir a sala na web, nas duas línguas, nos três estados de recusa.
4. Ler a tela do app linha a linha e conferir que existe caminho até ela.
5. Consertar, prender em teste, e rodar a suíte inteira.

## Arquivos afetados

- `app/admin/video-consultations/page.tsx` — os dois botões só para quem atende;
  "passadas" passa a ser o complemento de "por vir".
- `lib/admin-sections.ts` — a aba acesa é a aba em que se está.
- `app/video-room/[id]/page.tsx` — as duas línguas, inglês primeiro.
- `lib/video-call.ts` — o `too_early` em inglês diz a partir de quando.
- `components/cookie-consent.tsx` — a tarja não entra na sala.
- `app/api/patient/appointments/route.ts` — devolve `mode`.
- `mobile/app/(app)/(clinica)/consulta-video.tsx` — sai a string morta.
- `__tests__/agenda/a-sala-de-video-ponta-a-ponta.test.ts` — novo.

## Critérios de aceite

- [x] A matriz de recusas medida contra a Daily real, com os oito casos.
- [x] Nenhum botão de entrar/chamar onde o servidor vai recusar por permissão —
      e, no lugar dele, de quem é a consulta.
- [x] Nenhuma consulta some da tela; os três contadores fecham.
- [x] A aba acesa é a aba em que se está, nas sete da agenda.
- [x] A sala na web em inglês e em português, com o texto certo nos três erros.
- [x] A sala abre de verdade: iframe da Daily com token, câmera e microfone
      liberados.
- [x] O app tem dois caminhos até a tela de vídeo, e o toque no aviso é o
      terceiro.
- [x] `npx tsc --noEmit` limpo e a suíte inteira verde.
- [x] Teste novo verificado por sabotagem, não só por passar.
