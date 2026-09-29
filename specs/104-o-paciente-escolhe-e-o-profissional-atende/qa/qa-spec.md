# QA — Atividade 104

Regras da casa: **paciente de teste, nunca real**; confirmar qual checkout serve
a porta; afirmar o **status exato**, nunca "≠ 200"; nenhum token no relatório.

Um alerta específico desta atividade: **o limitador agrupa por ip + 4 segmentos
do caminho**, então uma matriz grande sob `/api/patient` bate no teto e devolve
`429`. Um `429` lido como "bloqueado" é um falso positivo de segurança.

## T-1 — O preço segue quem atende

| # | tipo | cenário | esperado |
|---|---|---|---|
| 1.1 | API | catálogo mostra Dr. X a £150 | a porta de agendamento **com** `professionalId` também dá £150 |
| 1.2 | API | a mesma, sem `professionalId` | preço da clínica do paciente, como hoje |
| 1.3 | API | trocar de profissional | o preço muda, sem recarregar a tela |
| 1.4 | API | exceção por paciente naquele serviço | a exceção **vence** o preço do profissional |
| 1.5 | API | mandar `price` no corpo do checkout | ignorado — o servidor recalcula |
| 1.6 | API | `professionalId` de quem não pode ser marcado | 404, e nenhum preço vaza |
| 1.7 | UI | o número do catálogo e o da tela de marcar | **idênticos**, medidos na mesma sessão |

## T-2 — A ordem das perguntas

| # | tipo | cenário | esperado |
|---|---|---|---|
| 2.1 | UI | abrir "Book" | o primeiro passo é **o quê**, não o calendário |
| 2.2 | UI | modalidade sem profissional disponível | **não aparece** |
| 2.3 | UI | só a reabilitação ligada | o passo é pulado, sem pedir escolha entre um |
| 2.4 | UI | escolher modalidade → lista de profissionais | nome, registro, idiomas e **preço** |
| 2.5 | UI | voltar um passo | o anterior continua escolhido |
| 2.6 | UI | a agenda é **daquele** profissional | e no fuso dele |

## T-3 — Primeira vez e retorno

| # | tipo | cenário | esperado |
|---|---|---|---|
| 3.1 | UI | paciente novo | "primeira consulta", e que o horário depende do pagamento |
| 3.2 | UI | paciente com pacote | "nada a pagar" e **quantas sobram** |
| 3.3 | UI | paciente em tratamento, sem sessão | "sessão extra", e o que acontece com o valor |
| 3.4 | UI | triagem pendente | explica e **leva** à triagem |
| 3.5 | UI | `price_not_set` | explica; não é beco sem saída |
| 3.6 | UI | as duas línguas | inglês primeiro, revisados juntos |

## T-4 — A área do profissional

| # | tipo | cenário | esperado |
|---|---|---|---|
| 4.1 | UI | médico define o preço dele | aparece no catálogo do paciente |
| 4.2 | UI | médico monta a agenda dele | o app oferece aqueles horários |
| 4.3 | UI | médico sem registro / sem Stripe | **diz por quê** não aparece |
| 4.4 | API | ler preço de outro inquilino | 404 |
| 4.5 | API | escrever agenda de outro inquilino | 404 |
| 4.6 | código | as abas novas respeitam `PAINEL_POR_TIPO` | varredura passa |

## Ponta a ponta, no fim

Um paciente de teste marca com um médico de teste: escolhe modalidade, vê o
preço, escolhe o horário da agenda **dele**, paga em test mode, e a consulta
nasce no inquilino do médico com o repasse certo. É o caminho que a 102 construiu
em pedaços e que esta atividade fecha.
