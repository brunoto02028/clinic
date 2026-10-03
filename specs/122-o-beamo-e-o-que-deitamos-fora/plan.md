# 122 — O BeamO, e o que já deitamos fora

**Estado:** em andamento — T-1 e T-2 implementadas em 03/10/2026
**Aberta em:** 03/10/2026
**Porquê agora:** o **Withings BeamO** chega amanhã (encomenda de 03/10, entrega 7h–13h). É um 4-em-1: termómetro sem contacto, **ECG**, oxímetro e **estetoscópio digital**, "multi-user, family care".

## O que isto destapou, e é mais grave do que o aparelho novo

A ingestão escreve uma linha no log com os tipos de medida que recebe e **não
sabe nomear**. A de hoje, em produção:

```
[withings-ingest] tipos de medida sem nome: 9×3, 10×3, 130×5
```

- `9` e `10` são diastólica e sistólica — tratadas noutro caminho, sem problema;
- **`130` é o resultado de fibrilhação atrial.**

Chegou **cinco vezes hoje**, e é **contado para o log e deitado fora**. O
`naoNomeados` só alimenta a contagem; o `rawPayload` guarda `samples: 3`, que é
um **número**, não as medidas. Nada disto fica.

A nossa própria documentação, medida em 02/10, já o dizia
(`docs/withings-api-2026-10-02.md`):

> *"os intervalos **135–138 (QRS, PR, QT, QTc)** e o **130 (afib)** saem pelo
> `getmeas`, não pelo `v2/heart`."*

Ou seja: o relógio detecta fibrilhação, manda-nos, e nós escrevemos o número do
tipo numa linha de log e esquecemos. Num produto cujo papel vai à mão de um
médico, é a pior forma da ausência silenciosa que estas duas últimas atividades
inteiras combateram.

## O que o BeamO acrescenta

| o que ele mede | o que temos hoje |
|---|---|
| Temperatura | `BODY_TEMPERATURE: 71` — tratado |
| SpO₂ | `SPO2: 54` — tratado |
| **ECG** | o traçado vem pelo `v2/heart`, como o do ScanWatch; o **nome do aparelho** vem da API, logo não é preciso inventar |
| **Estetoscópio** | **desconhecido** — é áudio, e não há indício de que a API o exponha |
| **Multi-utilizador** | **o risco** — ver abaixo |

## O risco que me preocupa mais: o multi-utilizador

O BeamO é vendido como *family care*: várias pessoas no mesmo aparelho. E já
temos a cicatriz disso — a braçadeira da clínica obriga a **conta dedicada e um
perfil só**, senão *"a leitura some em silêncio"*, e houve um review inteiro
(27/09) sobre o terapeuta que esquece de abrir a janela de medição e a leitura
cair no dono do aparelho.

Um aparelho multi-perfil na conta errada escreve a medição **de uma pessoa no
prontuário de outra**. Nada no código de hoje distingue perfis da Withings.

## Tarefas

| T | Nome | Depende | Estado |
|---|---|---|---|
| T-1 | [A janela decide de quem é cada medição](t-1-a-janela-decide-de-quem-e.md) | — | **feita** (03/10) — QA e review feitos, 8 achados corrigidos |
| T-2 | [O ECG do paciente entra na ficha do paciente](t-2-o-ecg-do-paciente-entra-na-ficha-do-paciente.md) | T-1 | **feita** (03/10) — o review apanhou **dois críticos**, ver [review](qa/review-t-1-e-t-2.md) |
| T-3 | [A temperatura e o SpO₂ do paciente](t-3-a-temperatura-e-o-spo2-do-paciente.md) | T-2 | **feita** (03/10) — `VitalReading`, e a regra que dispensa saber o modelo do aparelho |
| T-4 | Caixa de entrada para o que não é pressão, **e poder mover** | T-3 | pendente — precisa de schema (a `UnassignedMeasurement` exige pressão) |
| T-5 | O `130` deixa de ser deitado fora — a fibrilhação por PPG | decisão 1 | pendente |
| T-6 | Os intervalos do ECG: QRS, PR, QT, QTc (`135`–`138`) | T-5 | pendente |
| T-7 | Medir o que o BeamO manda, biomarcador a biomarcador | chegada | pendente |
| T-8 | O estetoscópio: a API expõe alguma coisa? | T-7 | pendente |
| T-9 | [O app nomeia o que mediu](t-9-o-app-nomeia-o-que-mediu.md) | T-2 | **feita** (03/10) — a conclusão era atribuída ao relógio do paciente em **cinco** sítios |

A numeração é a que está escrita no código e nos testes. As duas primeiras
nasceram do pedido dele de 03/10 e já estão feitas; as outras seis são o que
sobra.

### Porque a T-3 existe em separado

O caminho óbvio para temperatura e SpO₂ medidos num paciente era o
`WearableDataPoint`, que já tem as colunas `bodyTemperature` e `spo2`. **Não
serve**: a chave é `(utilizador, dia, tipo, provedor)` — a chave de um *total do
dia*. Uma medição pontual da clínica escrita ali apagaria, em silêncio, a média
do dia que o aparelho do próprio paciente guardou. É a mesma forma de defeito
que a 119 T-2 tirou do ECG, e seria recriá-la três semanas depois.

## Decisões a validar com o Bruno

1. **A fibrilhação por PPG não é a do ECG.** O `130` vem de leitura óptica, que
   a própria Withings trata como triagem. Entra como o quê — um sinal ao lado do
   ECG, ou uma coluna própria? **Não pode entrar como diagnóstico.** *(aberta)*
2. **O BeamO vai para a conta pessoal dele** — respondido em 03/10: *"O BeamO
   pode ir tanto pra mim quanto para o paciente, eu escolho na hora de usar."* A
   conta é a dele, e a janela de medição é a escolha. **Fechada.**
3. **Quem usa o BeamO na clínica?** Com a T-1 e a T-2 feitas, a resposta deixou
   de ser bloqueante: quem mede abre a janela, e quem não abrir fica com a
   medição do lado do dono. *(informativa)*

## O que esta atividade não faz

- Não trata o estetoscópio sem primeiro **medir** se a API o expõe. Áudio de
  auscultação é dado clínico pesado, e inventar um caminho para ele antes de
  saber o que chega seria construir sobre um palpite.
