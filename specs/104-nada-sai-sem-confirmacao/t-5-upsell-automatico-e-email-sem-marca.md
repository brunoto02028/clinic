# T-5: O upsell automático e o e-mail sem marca

**Status:** implementada em 02/10/2026 — QA pendente
**Depende de:** T-1

## Objetivo

Dois envios que não são só "sem confirmação" — são de natureza errada.

## Contexto

### 1. A venda escondida no fim do tratamento

`app/api/admin/patients/[id]/protocol/route.ts:588-600`:

```ts
// Send membership offer (post-treatment upsell) after a small delay
setTimeout(() => {
  notifyPatient({ patientId, emailTemplateSlug: 'MEMBERSHIP_OFFER', ... });
}, 5000);
```

Marcar o tratamento como concluído manda dois e-mails: o `TREATMENT_COMPLETED`
(linha 577, legítimo) e, cinco segundos depois, **uma oferta comercial**.
O `setTimeout` existe para os dois não chegarem juntos — ou seja, foi
desenhado para parecer que a oferta veio sozinha.

Três problemas, em ordem:

1. É **venda** disparada por um ato clínico, sem opt-in próprio.
2. `setTimeout` num handler de rota não tem garantia nenhuma: se o processo
   reciclar nesses 5s, some sem log. Se não sumir, dispara fora do pedido,
   sem rastro no `AuditLog` da ação.
3. O paciente acabou de concluir um tratamento. É o pior momento possível
   para uma mensagem que ele não pediu chegar como se fosse do cuidado.

### 2. O relatório que sai sem a marca

`app/api/admin/body-assessments/[id]/send-to-patient/route.ts:116` monta
HTML inline e manda por `sendEmail`, fora do caminho de template. Sem logo
da BPR e sem o layout que o resto do produto usa.

Isso quebra também uma regra antiga: nada vai ao paciente sem a logo e sem
o Bruno ver a prévia.

## Passos

1. **Tirar o `setTimeout`.** A oferta de plano sai do handler do protocolo.
2. Decidir com o Bruno o destino dela (ver T-8, mesma conversa): botão
   próprio na ficha, ou fila para ele soltar quando achar certo. **Não
   presumir que ela continua existindo.**
3. O `TREATMENT_COMPLETED` fica, mas passa pelo portão do T-1 com
   confirmação explícita, como os demais.
4. `send-to-patient` das avaliações corporais: trocar o HTML inline pelo
   template do produto, com logo, e entrar no caminho de prévia.
5. Varrer outros `setTimeout`/`void` em volta de envio — se este existe,
   pode haver irmão.

## Arquivos afetados

- `app/api/admin/patients/[id]/protocol/route.ts`
- `app/api/admin/body-assessments/[id]/send-to-patient/route.ts`
- template de e-mail da avaliação corporal (novo, se não houver)

## Critérios de aceite

- [ ] Nenhum `setTimeout` em volta de envio ao paciente sobra no
      repositório (prove com grep).
- [ ] Concluir um tratamento manda **no máximo** o que foi confirmado —
      prova por contagem na janela de 30s após a chamada, não de 1s.
- [ ] `MEMBERSHIP_OFFER` não sai por efeito colateral de mudança de status.
- [ ] O e-mail da avaliação corporal usa o template com logo BPR.
- [ ] Nenhum e-mail ao paciente é montado com HTML inline fora do caminho
      de template.
