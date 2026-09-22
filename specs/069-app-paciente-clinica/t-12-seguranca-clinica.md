# T-12: Segurança clínica — triagem e consentimento

**Status:** pendente
**Depende de:** nenhuma — **executar antes de tudo**

## Objetivo
Parar o app de registrar, em nome do paciente, respostas clínicas e um consentimento que ele nunca deu.

## Contexto
Dois achados da T-11 (`qa/report-t-11.md`). São os únicos da lista com consequência clínica e de compliance, por isso não esperam fase nenhuma.

### 1. A triagem afirma coisas que ninguém perguntou

`mobile/app/(app)/(clinica)/screening.tsx:72`:

```tsx
mutationFn: () => saveScreening({ ...form, consentGiven: true }, false),
```

O app **envia `consentGiven: true` no submit**, sem exibir texto de consentimento nem checkbox. O paciente nunca vê o que está aceitando.

Pior: as **12 red flags** da triagem web (dor noturna, disfunção vesical/intestinal, histórico de câncer, sintomas neurológicos, perda de peso inexplicada, febre, trauma recente, uso de corticoide, dor em repouso, dormência em sela, fraqueza progressiva, dor torácica) **não existem no formulário do app**. A rota grava `?? false`, então uma triagem criada pelo app registra as 12 como **"Não" sem terem sido perguntadas**.

Um terapeuta lendo esse prontuário conclui que o paciente negou sinais de alarme.

Ainda: `smoker` envia string para coluna `Boolean` — salvar "Estilo de vida" estoura.

### 2. O consentimento é inteiramente mock

`mobile/app/(app)/(clinica)/consent.tsx` não faz **nenhuma** chamada de API. Os textos estão fixos no JSX (a web busca de `/api/admin/consent-texts`, editável e bilíngue). A data **"Você aceitou os termos em 04/06/2026"** é literal — aparece para paciente criado hoje. O card "Termos aceitos" renderiza incondicionalmente. Diz "Você pode atualizar abaixo" e não há nada abaixo. Não existe checkbox nem ação de aceite.

## Passos
1. **Triagem:** ou incluir as 12 red flags no formulário do app, ou fazer a rota **não gravar** o que não foi perguntado (preservar `null`/valor anterior em vez de `?? false`). Decidir com o Bruno — a segunda é menor e imediata; a primeira é a paridade real.
2. Remover o `consentGiven: true` automático. O consentimento é ato explícito.
3. Corrigir o tipo de `smoker`.
4. **Consentimento:** buscar os textos de `/api/admin/consent-texts`, mostrar o estado real de aceite (data verdadeira ou nenhuma), e implementar o aceite — ou, se ficar para depois, **remover a tela do app** em vez de deixar uma que mente.
5. Verificar se alguma triagem/consentimento **já foi gravado em produção pelo app** e, se sim, avisar o Bruno: são dados clínicos a corrigir, não só código.

## Arquivos afetados
- `mobile/app/(app)/(clinica)/screening.tsx`
- `mobile/app/(app)/(clinica)/consent.tsx`
- `mobile/src/api/screening.ts`
- a rota de screening no backend (a que aplica `?? false`)

## Critérios de aceite
- [ ] Nenhuma red flag gravada sem ter sido perguntada
- [ ] `consentGiven` só vira `true` por ação explícita do paciente
- [ ] Tela de consentimento mostra o estado real, ou não existe
- [ ] `smoker` grava sem erro
- [ ] Levantamento de dados já afetados em produção, com resultado no report
