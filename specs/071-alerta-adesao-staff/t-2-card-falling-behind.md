# T-2: Card "Patients Falling Behind" no dashboard admin

**Status:** concluído
**Depende de:** T-1

## Objetivo

Dar ao staff um lugar visível (dashboard admin) que mostra quem está
atrasado, sem precisar abrir perfil por perfil.

## Contexto

Segue o padrão visual/estrutural de `components/admin/daily-adherence-card.tsx`
(mesma família de card, mesmo lugar — `app/admin/page.tsx:231`). Consome o
endpoint de T-1. Threshold fixo (ver Suposição #1 do plan.md, a confirmar).

## Passos

1. Criar `components/admin/adherence-falling-behind-card.tsx` — lista os
   pacientes retornados por `GET /api/admin/adherence/falling-behind`, cada
   linha com nome, dias sem atividade, link direto pro perfil do paciente.
2. Sinalizar visualmente quando há uma `patientNotes` nova não vista (ícone/
   badge) — o dado vem do endpoint de T-1, a leitura em si é T-4.
3. Adicionar o card em `app/admin/page.tsx`, ao lado do
   `daily-adherence-card` existente.
4. Estado vazio: "Nenhum paciente atrasado" quando a lista vem vazia — não
   esconder o card (consistência com o card de hoje).

## Arquivos afetados

- `components/admin/adherence-falling-behind-card.tsx` (novo)
- `app/admin/page.tsx`

## Critérios de aceite

- [ ] Card só aparece pra roles com acesso (mesma checagem do endpoint).
- [ ] Lista vazia mostra estado vazio claro, não fica em branco nem some.
- [ ] Link de cada paciente abre o perfil dele direto.
- [ ] Nenhuma chamada nova pra `notifyPatient` ou qualquer envio pro
      paciente — card é só leitura pro staff.
