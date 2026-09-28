# QA — 102

Cenários por tarefa. Cada relatório (`report-t-N.md`) responde a estes com
evidência **medida** — nunca "deve funcionar".

## Regras que valem em todos

- **Paciente de teste identificado.** Nunca logar ou semear num paciente real.
- **Nenhum token, cookie ou chave no relatório.** Tamanho e veredito.
- **Todo cenário adversário é por rota**, não por tela: esconder botão não é
  fechar porta.
- **404, nunca 403**, para o que não é seu — 403 confirma que existe.
- **QA online depois do deploy**, com o commit confirmado na lista de
  deployments do Coolify.
- **Um QA por vez**: dois dev servers disputando `.next`, a porta e o cookie
  por host falham em silêncio.

---

## T-1 — O tipo do profissional

| # | cenário | esperado |
|---|---|---|
| 1.1 | Criar cada um dos cinco tipos | a área nasce com os módulos do tipo |
| 1.2 | Médico/psicólogo/nutricionista sem número de registro | recusado |
| 1.3 | Clínica de reabilitação que já existe | nada muda, medido antes e depois |
| 1.4 | `type === "..."` solto no código | nenhum fora de `lib/tenant-type.ts` |

## T-2 — O que cada área mostra

| # | cenário | esperado |
|---|---|---|
| 2.1 | Para cada tipo, abrir **todas** as telas do menu dele | nenhuma responde erro |
| 2.2 | Pedir, por rota, um módulo que não é do tipo | 403 do servidor |
| 2.3 | Varredura da 100 T-4 | continua passando, por tipo |
| 2.4 | Estúdio de personal | idêntico ao de hoje |

## T-3 — O vínculo de cuidado

| # | cenário | esperado |
|---|---|---|
| 3.1 | Profissional **com** vínculo lê o paciente | 200, só o escopo liberado |
| 3.2 | Profissional **sem** vínculo | **404** |
| 3.3 | Vínculo encerrado | 404, e o histórico continua existindo |
| 3.4 | Profissional de outro inquilino, paciente de outro | 404 |
| 3.5 | Criar vínculo pelo painel, sem pagamento | não existe rota que faça isso |
| 3.6 | Leitura atravessada | registrada em auditoria |

## T-4 — A agenda de cada um

| # | cenário | esperado |
|---|---|---|
| 4.1 | Dois profissionais, janelas diferentes | vagas diferentes |
| 4.2 | Profissional sem janela | não é oferecido |
| 4.3 | Painel × app, mesmo dia, mesma pessoa | os dois concordam |
| 4.4 | Paciente em Londres, profissional no Brasil | horário certo nos dois |

## T-5 — O paciente escolhe

| # | cenário | esperado |
|---|---|---|
| 5.1 | Lista de profissionais | nome, tipo, registro, preço, idioma, formato |
| 5.2 | Trocar de profissional | a agenda muda junto |
| 5.3 | Profissional só-vídeo | não oferece presencial |
| 5.4 | Sem vaga | a tela diz, e oferece outro |
| 5.5 | Marcar sem pagar | nenhum vínculo criado |

## T-6 — Pagar e repassar

**Tudo em test mode.** Nenhum cenário com conta live antes de a matriz fechar.

| # | cenário | esperado |
|---|---|---|
| 6.1 | Pagar consulta com profissional externo | cobrança com taxa e destino |
| 6.2 | Webhook | consulta confirmada **e** vínculo criado |
| 6.3 | Reenvio do webhook | nada duplicado |
| 6.4 | Profissional sem Connect | não aparece para marcar |
| 6.5 | Reembolso | desfaz cobrança, taxa e consulta |
| 6.6 | Fechar a aba do Checkout | consulta continua pendente, sem vínculo |

## T-7 — Vídeo para todos

| # | cenário | esperado |
|---|---|---|
| 7.1 | Matriz de recusas com profissional externo | igual à da 101 T-1 |
| 7.2 | Admin da BPR na sala de consulta que não é dele | 404 |
| 7.3 | Paciente pelo app, profissional pelo painel | os dois entram |
| 7.4 | Nome na sala | o do profissional, com registro |

## T-8 — O que o profissional devolve

| # | cenário | esperado |
|---|---|---|
| 8.1 | Prévia antes de enviar | com logo da BPR, igual ao que o paciente vê |
| 8.2 | Enviar | só por botão, nunca automático |
| 8.3 | Documento no app | com nome e registro de quem assinou |
| 8.4 | Outro profissional lendo o documento | 404, sem liberação do paciente |
| 8.5 | Apagar receita | não existe; encerra-se |

## T-9 — Quem vê o quê

**A matriz adversária inteira, por rota.** Para cada par (tipo de profissional
× estado do vínculo × dono do paciente):

| # | cenário | esperado |
|---|---|---|
| 9.1 | Tabela de quem-vê-o-quê | escrita no relatório |
| 9.2 | Varredura das rotas com `patientId` | toda uma passa pelo helper |
| 9.3 | Cada tipo tentando alcançar paciente sem vínculo | 404 |
| 9.4 | Paciente de outra clínica | 404 |
| 9.5 | Vínculo encerrado | 404 |
| 9.6 | O paciente lendo quem tem acesso | lista completa, com datas |
| 9.7 | O paciente encerrando um acesso | corta na hora |
| 9.8 | A mesma matriz **em produção** | com paciente de teste identificado |
