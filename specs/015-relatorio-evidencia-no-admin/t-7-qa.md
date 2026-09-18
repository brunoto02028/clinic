# T-7: QA

**Status:** pendente
**Depende de:** T-1..T-6

## Objetivo
Validar o fluxo ponta a ponta: auto-geração na triagem, render no admin, red-flag, bilíngue.

## QA visual — acompanhar os DOIS lados
O QA visual roda o fluxo ponta a ponta com as duas visões abertas, na ordem real:
1. **Lado do paciente** (portal): logar como paciente, preencher/enviar a triagem em
   `/dashboard/screening` — mostrar que o envio é normal e **não trava** (a geração roda em
   background). Screenshots do lado do paciente.
2. **Lado da clínica** (admin): logar como staff, abrir a ficha do paciente →
   aba "Evidência" e ver o relatório sair de `GENERATING` para `DRAFT`. Screenshots do admin.
Ambos os lados capturados no mesmo report de QA.

## Passos (resumo — detalhe em qa/qa-spec.md)
1. Submeter uma triagem (paciente de teste) → confirmar que um `ClinicalEvidenceReport`
   `GENERATING` é criado e a resposta da triagem **não** trava.
2. Rodar o job (ou forçar) → report vira `DRAFT` com evidência real, cruzamento e sugestões.
3. Abrir a ficha do paciente no admin → aba "Evidência": conferir identidade BPR (logo/paleta),
   evidência por nível, sugestões rastreáveis, aviso clínico. Screenshots.
4. Caso **red-flag** (dor noturna + perda de peso) → report com banner e **sem** sugestões.
5. Toggle **EN/PT** e "traduzir PT".
6. Ações de status (DRAFT→UNDER_REVIEW→APPROVED).
7. Confirmar que **nada** aparece no portal do paciente.

## Arquivos afetados
- `specs/15-.../qa/report-t-*.md` + screenshots

## Critérios de aceite
- [ ] Auto-geração funciona sem travar a triagem.
- [ ] Relatório real gerado (evidência da Europe PMC + cruzamento + sugestões).
- [ ] Red-flag interrompe sugestões.
- [ ] Bilíngue OK; identidade BPR do topo ao rodapé.
- [ ] Nada exposto ao paciente.
