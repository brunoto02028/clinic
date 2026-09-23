# T-14: Dados falsos e endpoints quebrados

**Status:** implementado (aguardando QA)
**Depende de:** nenhuma

## Objetivo
Fazer as telas existentes mostrarem o dado do paciente, e não valores inventados.

## Contexto
Achados da T-11. Ao contrário da T-12, nada aqui grava informação errada no prontuário — mas o paciente **lê** informação falsa como se fosse clínica.

### Home — literais no JSX
`mobile/app/(app)/(clinica)/(tabs)/index.tsx:186-188`:

```tsx
YOUR PLAN · Shoulder
<Pill label="Day 12 of 42" variant="health" />
```

Fixos. Um paciente com plano de joelho e 8 sessões lê "ombro" e "dia 12 de 42". `"~15 min"` é `nExercícios × 5`. `"Directions"` é `onPress={() => {}}`. E **"Message the clinic" leva a `/clinical-notes`** — notas SOAP read-only, não um canal de mensagens.

### `clinical-notes` — endpoint que não existe
`/api/patient/clinical-notes` retorna **404** (confirmado: a pasta da rota não existe). `mobile/src/api/clinical-notes.ts:18` tem `catch { return [] }`, então a tela mostra "nenhuma nota" para sempre. Paciente com nota SOAP real vê tela vazia.

### `outcome-measures` — o save apaga o FAAM
`outcome-measures.tsx:25` envia `faamAdl: {}`, `faamSport: {}`, `faamAdlPercent: null`. O POST **appenda** linha nova e o GET lê a mais recente → **um save pelo app apaga na prática o FAAM do paciente**. Faltam as 13 perguntas do ADL e 6 do Sport.

### `treatment-protocol` — enum cru e dados da biblioteca
Imprime **"Fase SHORT_TERM"** para o paciente. Mostra `defaultSets`×`defaultReps` da **biblioteca de exercícios**, não da prescrição — terapeuta prescreve 4×15, paciente vê 3×10. Usa o `PATCH` legado increment-only enquanto a web usa `toggleLog`: os dois brigam pelo mesmo `completedCount`.

## Passos
1. Home: derivar plano, fase e duração do dado real; remover o `onPress` vazio; apontar "Message the clinic" para o destino certo (ou esconder até a T-4 portar `questions`).
2. `clinical-notes`: criar a rota `/api/patient/clinical-notes` ou apontar para a existente; **remover o `catch` que engole o erro** — falha tem que aparecer.
3. `outcome-measures`: enviar o payload completo ou não enviar. Nunca gravar parcial por cima.
4. `treatment-protocol`: traduzir o enum, ler sets/reps da prescrição, migrar para `toggleLog`.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/(tabs)/index.tsx`
- `mobile/app/(app)/(clinica)/treatment-protocol.tsx`
- `mobile/app/(app)/(clinica)/outcome-measures.tsx`
- `mobile/src/api/clinical-notes.ts`, `outcome-measures.ts`, `protocol.ts`
- possivelmente rota nova em `app/api/patient/clinical-notes/`

## Critérios de aceite
- [ ] Nenhum valor clínico literal no JSX
- [ ] Nenhum `catch` engolindo erro de rede sem sinalizar
- [ ] Salvar outcome-measures pelo app não apaga dado existente
- [ ] Sets/reps batem com a prescrição do terapeuta
- [ ] Nenhum enum cru em tela de paciente
