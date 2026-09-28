# T-6: O desvio que a clínica precisa ver

**Status:** pendente
**Depende de:** T-1

## Objetivo

Quando um número sai muito do que era daquela pessoa, **a clínica** fica
sabendo. O paciente não.

## Contexto

Monitorar sem ninguém olhar é guardar dado. O valor do acompanhamento contínuo
está em alguém notar a tempo — e "alguém" aqui é gente da clínica, não um texto
automático no telefone de quem foi medido.

Fibrilação atrial detectada pelo ScanWatch é o caso que torna isto urgente:
o aparelho conclui, nós guardamos, e hoje **ninguém é avisado**.

## Passos

1. Desvio é contra **a própria pessoa** — a média dela nas últimas semanas —,
   não contra uma faixa de população. Uma FC de repouso de 48 é desvio em quem
   vivia em 70, e é normal em quem vive em 50.
2. Fibrilação atrial detectada é destaque, sempre, sem depender de média.
3. Os desvios aparecem numa fila no painel, com o paciente, o número, a data e
   o que era antes.
4. Marcar como visto, e quem viu.
5. **Nada chega ao paciente por este caminho.** A clínica decide se e como
   fala com ele.

## Arquivos afetados

- `lib/monitoring-deviation.ts` (novo)
- `app/admin/biohacking/page.tsx`

## Critérios de aceite

- [ ] O desvio é medido contra o histórico da própria pessoa
- [ ] Fibrilação detectada aparece sem depender de média
- [ ] Quem tem pouco histórico **não** gera desvio (não há base para comparar)
- [ ] Nenhum aviso sai para o paciente
- [ ] A fila diz quem viu e quando
