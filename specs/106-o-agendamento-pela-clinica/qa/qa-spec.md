# QA — Atividade 106

Regras da casa: paciente de teste, nunca real; confirmar qual checkout serve a
porta; afirmar o status exato; nenhum token no relatório.

## T-1 — O texto que mente

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | UI | abrir o diálogo | nenhuma frase diz "automaticamente" |
| 1.2 | UI | criar **sem** marcar a caixa | **nenhum e-mail sai** — medido na caixa do paciente de teste, não deduzido da tela |
| 1.3 | UI | criar **marcando** a caixa | o e-mail sai |
| 1.4 | UI | depois de criar | há caminho visível para escrever a confirmação |
| 1.5 | UI | as duas línguas | dizem a mesma coisa |

O 1.2 é o cenário que importa: a promessa da casa é que nada sai sozinho, e ela
tem de ser medida no destino, não na interface.

## T-2 — A duração ocupa o horário

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | UI | 60 min e 30 min no mesmo dia | o de 60 tem o dobro da altura, medido em pixels |
| 2.2 | UI | consulta às 10:38 | começa entre 10:00 e 11:00, no minuto certo |
| 2.3 | UI | duas no mesmo horário | as duas visíveis, nenhuma escondida |
| 2.4 | UI | consulta de 15 min | o nome continua legível |
| 2.5 | UI | contador de vagas do dia | concorda com o que se vê |

## T-3 — Tipo e pagamento, sem camisa de força

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | UI | abrir o seletor de tipo de tratamento | **"Sem tipo ainda — sem cobrança"** é a **primeira** opção |
| 3.2 | UI | escolher um tipo pago e depois "sem tipo" | o preço **volta a zero**; o preço do tipo pago não fica para trás |
| 3.3 | UI | com preço 0 | nenhum modo de pagamento é oferecido, e a linha de "sem cobrança" aparece |
| 3.4 | UI+DB | marcar sem tipo e sem cobrança | a consulta nasce **`CONFIRMED`** |
| 3.5 | UI | voltar a um tipo pago | o modo de pagamento reaparece |

## T-4 — A agenda começa às oito

| # | tipo | cenário | esperado |
|---|---|---|---|
| 4.1 | UI+API | escolher uma data | a lista da tela é **igual** a `GET /api/availability?date=&duration=` para a mesma data e duração |
| 4.2 | UI+API | mudar a duração de 60 para 90 | a lista muda, e continua batendo com a API |
| 4.3 | UI | um dia em que a clínica não atende | a mensagem "não atende neste dia" aparece e o campo de hora fica **desabilitado** |
| 4.4 | UI | escolher uma hora e trocar para uma data que não a tem | a hora escolhida é **limpa** |
| 4.5 | UI+API | consulta às 07:00, criada por API | a faixa da grade semanal **estica** e a desenha |

## T-5 — Uma caixa marcada, dois e-mails

| # | tipo | cenário | esperado |
|---|---|---|---|
| 5.1 | UI+log | criar **sem** marcar a caixa | **nenhum e-mail** e **nenhum push** no log |
| 5.2 | UI+log | criar **marcando** a caixa | o e-mail sai **e** o push é disparado — os dois medidos no log |
| 5.3 | UI | o texto da caixa, nas duas línguas | cita os **três** envios: confirmação, notificação do app, aviso de triagem |

## T-6 — A clínica marca como pago

Mexe em dinheiro: cada ✅ aqui precisa da linha de `Payment` lida no banco, não
só do que a tela diz.

| # | tipo | cenário | esperado |
|---|---|---|---|
| 6.1 | UI+DB | marcar **Transferência** numa consulta `PENDING` com preço | consulta vira `CONFIRMED` **e** nasce `Payment` com `channel=TRANSFER`, `status=SUCCEEDED`, `recordedById` preenchido e `amount` **igual ao preço da consulta** |
| 6.2 | UI+DB | o mesmo com **Dinheiro** | idem, com `channel=CASH` |
| 6.3 | UI+API+DB | consulta **sem cobrança** (preço 0) | os botões **não aparecem**; chamar a rota direto responde **409 `nothing_to_pay`** e nada é criado |
| 6.4 | API+DB | consulta **já paga** | **409 `already_paid`**, e **nenhuma** segunda linha de `Payment` |
| 6.5 | API+DB | desfazer (`DELETE`) | o pagamento vira **`FAILED`** (não some) e a consulta volta a **`PENDING`** |
| 6.6 | API+DB | `DELETE` num pagamento da Stripe | **409 `stripe_payment`**, e nada muda |
| 6.7 | API | consulta de **outra clínica** | **404**, nunca 403 — status exato afirmado |
| 6.8 | API+DB | **terapeuta** chamando a rota | **403**, e nenhum `Payment` criado |
| 6.9 | UI/DB | a fatura/relatório passa a contar esse dinheiro | medir se der; se não der, dizer que não mediu |
