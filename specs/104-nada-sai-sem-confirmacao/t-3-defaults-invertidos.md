# T-3: Defaults invertidos e o rótulo que mente

**Status:** pendente
**Depende de:** T-1

## Objetivo

Três lugares onde o sistema manda **por omissão**. São os mais baratos de
consertar e os que mais surpreendem, porque o usuário acha que escolheu.

## Contexto

### 1. `broadcasts/route.ts:103` — `notify` nasce `true`

Aviso em massa para todos os pacientes do tenant, e a caixa vem marcada.
Quem não souber desmarcar, manda. O push, na linha 109, nasce `false` — o
mesmo arquivo já tem o padrão certo três linhas abaixo.

Agrava: já houve vazamento cross-tenant nesta rota (11/09/2026), então ela
já é a mais sensível do painel.

### 2. `appointments/route.ts:94` — sai mesmo quando se pede para não sair

```ts
const emailPatientNow = paymentMode === "online" || sendConfirmation !== false;
```

Duas coisas: `sendConfirmation` ausente manda (deveria ser o contrário), e
`paymentMode === "online"` manda **mesmo com `sendConfirmation: false`** —
o `||` passa por cima da recusa explícita.

A confirmação de consulta é legítima e provavelmente deve continuar
saindo. O defeito é ela ignorar um "não" explícito.

### 3. `email-test/route.ts:50/73/105` — "simular" que manda de verdade

```ts
const email = patient?.email || (session.user as any).email;
```

O botão diz *simular*. Com `patientId` no corpo, escreve para o paciente
real — `WELCOME`, `SCREENING_RECEIVED` ou o template que vier no slug.
É a ferramenta de diagnóstico virando disparo acidental.

## Passos

1. `broadcasts`: inverter o default de `notify` para `false`. A UI passa a
   marcar explicitamente. Conferir se algum chamador depende da omissão.
2. `appointments`: `sendConfirmation: false` passa a valer **sempre**,
   inclusive em pagamento online. Separar as duas perguntas: "confirmar a
   consulta?" e "mandar o aviso agora?".
3. `email-test`: duas saídas, escolher com o Bruno —
   - (a) nunca aceitar `patientId`: o teste vai sempre para o admin da
     sessão, com os dados do paciente só preenchendo as variáveis; ou
   - (b) manter, exigindo `confirmEnviarAoPacienteReal: true` e trocando o
     rótulo do botão.
   **Preferir (a)**: um botão de diagnóstico não precisa tocar a caixa de
   entrada de ninguém de fora.
4. Rever o rótulo na tela, nos três casos. "Simular" não pode mandar.

## Arquivos afetados

- `app/api/admin/broadcasts/route.ts`
- `app/api/admin/appointments/route.ts`
- `app/api/admin/email-test/route.ts`
- componentes de broadcast, de criar consulta e da tela de diagnóstico

## Critérios de aceite

- [ ] `POST /api/admin/broadcasts` sem `notify` no corpo **não** notifica.
- [ ] `POST /api/admin/appointments` com `sendConfirmation: false` e
      `paymentMode: "online"` não manda nada ao paciente.
- [ ] A consulta é criada normalmente nos dois casos acima — recusar o
      aviso não pode recusar a ação.
- [ ] `email-test` com `patientId` não escreve para o paciente (ou exige o
      campo novo, se for a saída (b)).
- [ ] Nenhum texto de botão diz "simular"/"testar" para algo que sai.
- [ ] Prova por contagem de `PatientOutboundEmail` antes e depois, não por
      tela verde.
