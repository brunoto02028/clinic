# QA — Atividade 095 (os ajustes para publicar)

Escrita junto com o plano, em 27/09/2026. O que não puder ser executado é
**"não executado"**, nunca "passou".

## O ambiente

- Dev server numa **porta própria deste QA**, confirmada como este checkout.
  Worktrees paralelos disputam a :4000.
- **Nunca logue nem semeie em paciente real.** Paciente de teste identificado.
- Telas do app só rodam em aparelho, com build. Enquanto não houver, cenário de
  UI do app é **não executado**, verificado por código.

## T-1 — O aviso no telefone

| # | passos | esperado |
|---|---|---|
| 1.1 | paciente **com** aparelho: broadcast com o interruptor ligado | chega no telefone, e o painel mostra 1 enviado |
| 1.2 | paciente **sem** aparelho | antes de enviar, a tela diz "nenhum aparelho"; depois, 0 enviados |
| 1.3 | paciente com `pushEnabled: false` | não recebe, e a tela diz por quê |
| 1.4 | token morto (`DeviceNotRegistered`) | conta como falha, e o aparelho é desativado |
| 1.5 | broadcast com o interruptor **desligado** | ninguém recebe push; a mensagem continua no portal |
| 1.6 | a contagem na tela | bate com a do banco |
| 1.7 | o caso do Bruno, em produção | chega — e a causa anterior está escrita |

**A que mais importa:** 1.2. O painel dizer "enviado" quando não havia para onde
enviar é o que fez perder uma tarde.

## T-2 — A consulta por vídeo

| # | passos | esperado |
|---|---|---|
| 2.1 | `/admin/video-consultations` sem nenhuma consulta por vídeo | ensina a criar, com link |
| 2.2 | editar uma consulta presencial e virar para vídeo | salva, e o selo aparece na agenda |
| 2.3 | o filtro "só por vídeo" | mostra as de vídeo e esconde as outras |
| 2.4 | o botão de consulta de teste | cria com paciente de teste, nunca real |
| 2.5 | o roteiro, seguido do começo ao fim | marcar, chamar, entrar pelos dois lados |
| 2.6 | a consulta de teste, depois | dá para apagar sem sujeira |

## T-3 — A relação com o menor

| # | passos | esperado |
|---|---|---|
| 3.1 | cadastrar menor sem escolher relação | recusado, com a frase dizendo o que falta |
| 3.2 | escolher "outro" sem descrever | recusado |
| 3.3 | cadastrar com relação | salva, e aparece no card |
| 3.4 | consentimento do exame desse menor | traz a relação declarada |
| 3.5 | pedido ao laboratório | idem |
| 3.6 | card da consulta de um menor, no painel | diz que o responsável comparece junto |
| 3.7 | pessoa gerida **antiga**, sem relação | a tela pede na primeira abertura; nada é apagado |
| 3.8 | maior de 18 gerido | a relação **não** é obrigatória |
| 3.9 | a lista de opções, nas duas línguas | completa, sem opção vazia pré-selecionada |

**A que mais importa:** 3.4 e 3.5. O ponto do pedido é ter prova de quem
respondeu pela criança; se a relação não sai impressa, o campo é decoração.

## T-4 — A cor

| # | passos | esperado |
|---|---|---|
| 4.1 | contraste **antes**, tema claro | medido e escrito |
| 4.2 | contraste **antes**, tema escuro | idem |
| 4.3 | contraste **depois**, nos dois | maior que antes, e ≥ 3:1 |
| 4.4 | o botão no estado carregando | continua legível |
| 4.5 | o mesmo botão em tarefas e protocolo | mudou junto |

## T-5 — Exercício avulso

| # | passos | esperado |
|---|---|---|
| 5.1 | mandar um exercício de dentro de uma pasta de dez | o paciente recebe **um** |
| 5.2 | tirar esse exercício do paciente | os outros ficam |
| 5.3 | a tela do paciente | não mostra nome de pasta da clínica |
| 5.4 | séries/repetições no avulso | valem |
| 5.5 | mandar a pasta inteira | continua funcionando |
| 5.6 | o card de aderência do painel | conta o que foi mandado, não o que está na pasta |
| 5.7 | mandar para paciente de outra clínica | recusado |

## T-6 — Responder ao vídeo

| # | passos | esperado |
|---|---|---|
| 6.1 | responder por texto | chega na conversa e aparece junto da submissão |
| 6.2 | responder por áudio | idem, e toca nos dois lados |
| 6.3 | responder por vídeo | idem |
| 6.4 | arquivar | sai da fila; continua no prontuário |
| 6.5 | ver arquivados e desarquivar | volta para a fila |
| 6.6 | submissão de paciente de outra clínica | não aparece |
| 6.7 | a resposta, antes de enviar | tem prévia; nada sai sozinho |

**A que mais importa:** 6.4. Arquivar que apaga é perda de registro clínico.

## T-7 — Pain Trend por data

| # | passos | esperado |
|---|---|---|
| 7.1 | registrar a dor de ontem | grava no dia de ontem |
| 7.2 | registrar dia futuro | recusado |
| 7.3 | além do limite para trás | recusado, com a frase dizendo o limite |
| 7.4 | regravar um dia que já tem valor | substitui, e avisa que substituiu |
| 7.5 | o gráfico | distingue registro do dia de registro retroativo |
| 7.6 | fuso | o dia gravado é o dia da clínica, não o do servidor |

## T-8 — O calendário

| # | passos | esperado |
|---|---|---|
| 8.1 | calendário do paciente | dias com vaga marcados |
| 8.2 | tocar num dia | mostra os horários livres |
| 8.3 | dia bloqueado em `/admin/availability` | não aparece como livre |
| 8.4 | consulta × sessão de tratamento | aparecem separadas, com durações certas |
| 8.5 | consulta já marcada | aparece, dizendo se é presencial ou por vídeo |
| 8.6 | o mesmo dia no painel e no app | concordam |
| 8.7 | horário que acabou de ser tomado | some do app ao recarregar |

**A que mais importa:** 8.3 e 8.7. Oferecer horário que não existe é marcar em
cima de outro paciente.
