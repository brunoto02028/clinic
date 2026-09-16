# Ativ. 44 — Controle semana a semana do protocolo no admin

**Status:** em andamento

## Objetivo
Dar ao fisioterapeuta, na aba **Protocol** da ficha do paciente (`app/admin/patients/[id]/page.tsx`),
os controles pra: liberar o plano **semana a semana** com um clique, **adicionar exercícios numa
semana específica** sem que a paciente veja nada em branco, e **ligar cada item a um exercício da
biblioteca** (é isso que faz o vídeo aparecer pra paciente).

## Situação atual (verificada em produção, 16/09/2026)
- Paciente real (Ana Livia): protocolo ACL com 58 itens / 39 semanas. Liberação feita item a item
  (`ProtocolItem.hiddenFromPatient`): 50 escondidos, 8 visíveis (semanas 1 e 1-2).
- A lista de itens na aba Protocol é plana — não mostra a semana de cada item. Liberar a semana 3 =
  achar e clicar no olho de cada item daquela semana, um por um.
- Existe um painel "Patient Release" (+1 week etc., via `releasedThroughWeek`), mas só na página AI
  Assessment, não na aba Protocol — e ele não desesconde itens escondidos individualmente.
- "Add item" cria na hora um item "New item" **visível** na semana 1 → a paciente vê um item em
  branco até ele ser editado.
- O form de editar item não tem semana, instruções nem ligação com a biblioteca de exercícios.
- `exerciseId` é descartado pelo filtro de campos (`lib/tenant-field-guard.ts` remove chaves
  estrangeiras) — hoje não há como ligar um item a um exercício pelo admin.
- 41 itens da Ana já estão ligados a exercícios da biblioteca, nenhum tem vídeo ainda. Subir o vídeo
  em Clinical → Exercises já faz aparecer pra ela automaticamente.
- Protocolos arquivados continuam listados na aba como se estivessem ativos.
- **Risco achado ao montar o plano:** o form "Edit" do protocolo sempre reenvia o status atual. Num
  protocolo já enviado, a API trata isso como "enviar de novo": exige dias/horário de sessão (o da
  Ana não tem → não dá pra salvar nem o título) e, quando a agenda está completa, cria mais 12
  consultas pendentes a cada "Save".

## Decisões de design
1. **Mecanismo único na aba Protocol: `hiddenFromPatient` por item.** É o que a Ana usa hoje. O
   botão "Liberar semana"/"Esconder semana" alterna esse campo em todos os itens do grupo de uma vez
   (uma chamada, não N). Não mexe em `releasedThroughWeek`.
2. **Agrupamento por semana igual ao da tela da paciente** (chave `startWeek-endWeek`, mesma ordem e
   mesmo rótulo "Week 1" / "Weeks 1-2" / "Week 5+"), pra o que o Bruno vê bater com o que ela vê.
3. **Item novo nasce escondido e na semana escolhida.** "Add item" vira "Add item to this week"
   dentro de cada grupo (herda `startWeek`/`endWeek` do grupo), com `hiddenFromPatient: true`, e
   abre direto no form de edição. Só aparece pra paciente quando o Bruno liberar.
4. **Ligar exercício por um caminho validado**, não abrindo o filtro geral de campos: o update de
   item aceita `exerciseId` separadamente, confere que o exercício existe e é da mesma clínica do
   protocolo, ou `null` pra desligar.
5. **Vídeo = do exercício da biblioteca.** O form mostra se o exercício ligado tem vídeo e um link
   pra abrir a biblioteca (Clinical → Exercises) pra subir. Sem upload novo nesta atividade.
6. **Enviar ao paciente é um evento, não um estado reenviado.** Checagem de agenda e criação de
   consultas só rodam quando o protocolo passa pela primeira vez para `SENT_TO_PATIENT` (vindo de
   rascunho/revisão/aprovado). Salvar edições ou restaurar um arquivado não repete isso.
7. **Arquivados separados**: protocolos `ARCHIVED` vão pro fim, recolhidos, com badge "Archived" e
   botão "Restore".

## Tarefas

| T-N | Nome | Status |
|-----|------|--------|
| T-1 | API — ligar exercício ao item + liberar/esconder semana em lote | implementado, aguardando QA |
| T-2 | UI — itens agrupados por semana + liberar/esconder semana | implementado, aguardando QA |
| T-3 | UI — form de item completo (semana, instruções, exercício/vídeo) + "Add item" escondido | implementado, aguardando QA |
| T-4 | Checagem de agenda e criação de consultas só no primeiro envio | implementado, aguardando QA |
| T-5 | UI — protocolos arquivados recolhidos (com "Restore") | implementado, aguardando QA |

## Suposições (validar com o usuário)
- "Liberar semana" desesconde **todos** os itens daquele grupo, inclusive algum que você tenha
  escondido de propósito dentro da semana — dá pra esconder de novo item a item depois.
- Grupos de semana diferentes que se sobrepõem (ex.: "Week 1" e "Weeks 1-2") são liberados
  separadamente, cada um com seu botão — igual aparecem na tela da paciente.
- O resumo "Paciente vê: semanas X–Y" considera só itens visíveis (e `releasedThroughWeek`, se
  estiver definido).
- Busca de exercício usa o endpoint que já existe (`GET /api/admin/exercises?search=`), limitado aos
  exercícios da clínica.
- O link pra subir vídeo abre a biblioteca já filtrada pelo nome do exercício. A página da
  biblioteca hoje não lê parâmetros da URL — T-3 adiciona só a leitura de `?search=` pra preencher
  a busca (não abre o exercício sozinho; você clica nele pra subir o vídeo).
- Não mexo na tela da paciente nem no painel "Patient Release" da página AI Assessment.
