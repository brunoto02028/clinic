# T-3: Modelos de confirmação de consulta/visita

**Status:** concluído (QA aprovado — qa/report-t-3.md; code review feito)
**Depende de:** T-1, T-2

## Objetivo
Pré-preencher o e-mail de confirmação com os dados da consulta.

## Passos
1. Modelos "Confirmação de consulta" e "Confirmação de visita domiciliar" (EN/PT) com variáveis: nome, data e hora em Europe/London, endereço, terapeuta, valor.
2. Atalho "Enviar confirmação" na linha da consulta (abre o composer já preenchido, na etapa de escrever).
3. (Se aprovado na Suposição 6) o formulário "New Appointment" passa a criar sem enviar.

## Arquivos afetados
- lib/patient-email.ts (modelos)
- app/admin/appointments/page.tsx
- (opcional) app/api/admin/appointments/route.ts

## Critérios de aceite
- [x] Hora e data corretas no fuso do Reino Unido (verão e inverno)
- [x] Texto usa "Terapeuta"/"therapist"
- [x] Atalho abre o composer preenchido; nada é enviado até a prévia e o clique
