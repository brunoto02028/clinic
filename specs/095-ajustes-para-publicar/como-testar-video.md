# Como testar a consulta por vídeo, do começo ao fim

Escrito em 27/09/2026 (095 T-2), porque *"não sei onde vejo algum agendamento com
paciente para fazer uma consulta por vídeo. Nem como testar o vídeo."*

A funcionalidade existia inteira. O que faltava era o caminho.

## Antes de começar

| o que | onde está |
|---|---|
| `DAILY_API_KEY` e `VIDEO_CALLS_ENABLED=true` | **já em produção** (Coolify, 27/09) |
| a tela do paciente | já no binário do TestFlight — o app tem `@daily-co/react-native-daily-js` |
| a sala | nasce **no servidor**, na primeira vez que alguém pede para entrar |

**Use um paciente de teste identificado.** Nunca um paciente real: entrar na
consulta de alguém para testar é entrar na consulta de alguém.

## O caminho curto (cinco minutos)

1. Abra **`/admin/video-consultations`**.
2. Clique em **"Test it now"**. A data já vem preenchida para daqui a cinco
   minutos, com duração de 30 e o tipo `TEST — video call`.
3. Escolha o **paciente de teste** e confirme.
4. Espere a hora chegar a dez minutos da consulta — que, com cinco minutos à
   frente, é agora.
5. Clique em **"Call patient"**. O telefone dele toca, e a resposta diz em
   **quantos aparelhos** — zero significa que aquele paciente não tem o app ou
   desligou os avisos, não que a chamada falhou.
6. Clique em **"Join Video Call"**. Abre `/video-room/<id da consulta>` numa aba
   nova, e o navegador pede câmera e microfone.
7. No telefone, toque no aviso — ou abra **Consultas** no app e entre pela
   consulta.

## O caminho a partir de uma consulta que já existe

Foi o que faltava e criou a confusão: a agenda estava cheia de presenciais, e
não havia por onde transformar uma.

1. **`/admin/appointments`** → botão **Edit** na consulta.
2. No campo **Formato**, escolha **À distância**.
3. Salve. A linha ganha o selo **"Por vídeo"**, e o mês ganha o ícone.
4. Os botões **Entrar** e **Chamar paciente** aparecem na linha — **só na
   consulta de quem está logado**. Se você é admin e não é o terapeuta daquela
   consulta, eles não aparecem, e isso é proposital.
5. O filtro **"Só por vídeo"**, no topo, mostra quantas existem.

## A janela

- A sala **abre dez minutos antes** do horário e **fecha trinta depois**.
- Antes disso, entrar e chamar respondem *"a consulta ainda não abriu — você
  chama a partir de dez minutos antes"*.
- Depois, *"esta consulta já terminou"*.
- Consulta **cancelada, faltada ou concluída** não abre e não chama.

Quem decide isso é o servidor, não o relógio do navegador: um computador com a
hora errada não abre a sala mais cedo.

## O que o paciente vê

- Na lista de consultas, a dele diz que é **por vídeo** antes de ele abrir.
- O aviso no telefone diz *"seu terapeuta está esperando"* e abre direto na
  consulta.
- A chamada roda **dentro do app**, nativa — não é uma página de navegador.
- Se for um menor, quem entra é o responsável, e o nome que aparece na sala é
  **"Nome da criança (com Nome do responsável)"**: o terapeuta precisa saber com
  quem está falando.

## Depois

- Apague a consulta de teste pela agenda.
- A sala da Daily expira sozinha (`exp` + `eject_at_room_exp`), não precisa
  apagar nada lá.
- **Nada é gravado** — nem imagem nem som. A plataforma está configurada de modo
  que a gravação não possa ser iniciada, e os termos 1.3 dizem isso ao paciente.

## Se não funcionar

| sintoma | onde olhar |
|---|---|
| "ainda não disponível" | `VIDEO_CALLS_ENABLED` e `DAILY_API_KEY` no Coolify |
| "esta consulta não está disponível" | você não é o terapeuta daquela consulta (é 404 de propósito) |
| o telefone não toca | veja o contador de aparelhos; zero é o próprio paciente sem app |
| a sala abre e ninguém entra | confirme que a consulta é a mesma nos dois lados: o id da URL é o **id da consulta** |
